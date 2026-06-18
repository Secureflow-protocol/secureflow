import { Router } from "express";
import { getSupabase } from "../lib/supabase.js";
import { internalError, serviceUnavailable } from "../lib/errors.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
  postMessageBody,
  getConversationQuery,
  getInboxQuery,
  getUnreadCountQuery,
  patchConversationReadQuery,
  patchMessageReadParams,
  patchMessageReadQuery,
} from "../schemas/messages.js";

export const messagesRouter = Router();

function conversationId(a: string, b: string): string {
  return [a, b].sort().join(":");
}

// POST /v1/messages — send a message
messagesRouter.post("/", validateBody(postMessageBody), async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    serviceUnavailable(res, "Messages store");
    return;
  }

  const { sender_address, recipient_address, content } = req.body;
  const convId = conversationId(sender_address, recipient_address);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: convId,
      sender_address,
      recipient_address,
      content: content.trim(),
    })
    .select("id, created_at")
    .single();

  if (error) {
    internalError(res);
    return;
  }

  res.status(201).json({ id: data.id, created_at: data.created_at });
});

// GET /v1/messages/conversation?a=ADDR1&b=ADDR2&since=ISO — fetch chat thread
messagesRouter.get(
  "/conversation",
  validateQuery(getConversationQuery),
  async (req, res) => {
    const supabase = getSupabase();
    if (!supabase) {
      res.json({ messages: [] });
      return;
    }

    const a = String(req.query.a ?? "").trim();
    const b = String(req.query.b ?? "").trim();
    const since = String(req.query.since ?? "").trim();
    const convId = conversationId(a, b);

    let query = supabase
      .from("messages")
      .select(
        "id, sender_address, recipient_address, content, read_at, created_at",
      )
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (since) {
      query = query.gt("created_at", since);
    }

    const { data, error } = await query;
    if (error) {
      internalError(res);
      return;
    }

    res.json({ messages: data ?? [] });
  },
);

// GET /v1/messages/inbox?wallet=ADDR — list all conversations with latest message + unread count
messagesRouter.get("/inbox", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.json({ conversations: [] });
    return;
  }

  const wallet = String(req.query.wallet ?? "").trim();
  if (!STELLAR_ADDR.test(wallet)) {
    res.status(400).json({ error: "wallet must be a valid Stellar G-address" });
    return;
  }

  // Fetch messages where user is sender OR recipient, ordered by newest first
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_address, recipient_address, content, read_at, created_at",
    )
    .or(`sender_address.eq.${wallet},recipient_address.eq.${wallet}`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Group by conversation, keep latest message + unread count
  const convMap = new Map<
    string,
    {
      conversation_id: string;
      other_address: string;
      latest_message: string;
      latest_at: string;
      unread: number;
    }
  >();

  for (const row of data ?? []) {
    const other =
      row.sender_address === wallet
        ? row.recipient_address
        : row.sender_address;
    if (!convMap.has(row.conversation_id)) {
      convMap.set(row.conversation_id, {
        conversation_id: row.conversation_id,
        other_address: other,
        latest_message: row.content,
        latest_at: row.created_at,
        unread: 0,
      });
    }
    // Count unread: messages sent TO this wallet that have no read_at
    if (row.recipient_address === wallet && !row.read_at) {
      const entry = convMap.get(row.conversation_id)!;
      entry.unread++;
    }
  }

  res.json({ conversations: Array.from(convMap.values()) });
});

// GET /v1/messages/unread-count?wallet=ADDR — total unread count for badge
messagesRouter.get("/unread-count", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.json({ count: 0 });
    return;
  }

  const wallet = String(req.query.wallet ?? "").trim();
  if (!STELLAR_ADDR.test(wallet)) {
    res.status(400).json({ error: "wallet must be a valid Stellar G-address" });
    return;
  }

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_address", wallet)
    .is("read_at", null);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ count: count ?? 0 });
});

// PATCH /v1/messages/conversation/read?a=ADDR1&b=ADDR2&wallet=ADDR — mark all messages in thread as read
messagesRouter.patch("/conversation/read", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.status(503).json({ error: "Messages store not configured" });
    return;
  }

  const a = String(req.query.a ?? "").trim();
  const b = String(req.query.b ?? "").trim();
  const wallet = String(req.query.wallet ?? "").trim();

  if (
    !STELLAR_ADDR.test(a) ||
    !STELLAR_ADDR.test(b) ||
    !STELLAR_ADDR.test(wallet)
  ) {
    res
      .status(400)
      .json({ error: "a, b, and wallet must be valid Stellar G-addresses" });
    return;
  }

  const convId = conversationId(a, b);
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", convId)
    .eq("recipient_address", wallet)
    .is("read_at", null);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ ok: true });
});

// PATCH /v1/messages/:id/read?wallet=ADDR — mark single message as read
messagesRouter.patch("/:id/read", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.status(503).json({ error: "Messages store not configured" });
    return;
  }

  const id = req.params.id;
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid message id" });
    return;
  }

  const wallet = String(req.query.wallet ?? "").trim();
  if (!STELLAR_ADDR.test(wallet)) {
    res.status(400).json({ error: "wallet must be a valid Stellar G-address" });
    return;
  }

  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_address", wallet)
    .is("read_at", null);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ ok: true });
});
