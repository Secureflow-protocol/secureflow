import { Router } from "express";
import { getSupabase } from "../lib/supabase.js";

export const notificationsRouter = Router();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

notificationsRouter.get("/", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.json({ notifications: [] });
    return;
  }

  const wallet = String(req.query.wallet ?? "").trim();
  if (!wallet || !wallet.startsWith("G")) {
    res.status(400).json({ error: "wallet query must be a Stellar G-address" });
    return;
  }

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, wallet_address, type, title, message, read_at, action_url, data, created_at",
    )
    .eq("wallet_address", wallet)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const notifications = (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: !!row.read_at,
    timestamp: row.created_at,
    actionUrl: row.action_url ?? undefined,
    data: row.data ?? {},
  }));

  res.json({ notifications });
});

notificationsRouter.patch("/:id/read", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.status(503).json({ error: "Notifications store not configured" });
    return;
  }

  const id = req.params.id;
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  const wallet = String(req.query.wallet ?? "").trim();
  if (!wallet || !wallet.startsWith("G")) {
    res.status(400).json({ error: "wallet query must be a Stellar G-address" });
    return;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("wallet_address", wallet);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ ok: true });
});

notificationsRouter.post("/", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    res.status(503).json({ error: "Notifications store not configured" });
    return;
  }

  const {
    wallet_address,
    type,
    title,
    message,
    action_url,
    data: payload,
  } = req.body ?? {};

  const wallet = String(wallet_address ?? "").trim();
  if (!wallet || !wallet.startsWith("G")) {
    res.status(400).json({ error: "wallet_address must be a Stellar G-address" });
    return;
  }

  if (!type || !title || !message) {
    res.status(400).json({ error: "type, title, and message are required" });
    return;
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      wallet_address: wallet,
      type: String(type),
      title: String(title),
      message: String(message),
      action_url: action_url ? String(action_url) : null,
      data: payload && typeof payload === "object" ? payload : {},
    })
    .select("id")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json({ id: data.id });
});
