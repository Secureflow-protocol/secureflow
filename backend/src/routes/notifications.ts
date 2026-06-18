import { Router } from "express";
import { getSupabase } from "../lib/supabase.js";
import { internalError, serviceUnavailable } from "../lib/errors.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
  getNotificationsQuery,
  patchNotificationReadQuery,
  patchNotificationReadParams,
  postNotificationBody,
} from "../schemas/notifications.js";

export const notificationsRouter = Router();

notificationsRouter.get(
  "/",
  validateQuery(getNotificationsQuery),
  async (req, res) => {
    const supabase = getSupabase();
    if (!supabase) {
      res.json({ notifications: [] });
      return;
    }

    const wallet = String(req.query.wallet ?? "").trim();

    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, wallet_address, type, title, message, read_at, action_url, data, created_at",
      )
      .eq("wallet_address", wallet)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      internalError(res);
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
  },
);

notificationsRouter.patch(
  "/:id/read",
  validateQuery(patchNotificationReadQuery),
  async (req, res) => {
    const supabase = getSupabase();
    if (!supabase) {
      serviceUnavailable(res, "Notifications store");
      return;
    }

    const idResult = patchNotificationReadParams.safeParse({ id: req.params.id });
    if (!idResult.success) {
      res.status(400).json({
        error: "Validation failed",
        details: [{ field: "id", message: "Invalid notification id" }],
      });
      return;
    }

    const wallet = String(req.query.wallet ?? "").trim();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", idResult.data.id)
      .eq("wallet_address", wallet);

    if (error) {
      internalError(res);
      return;
    }

    res.json({ ok: true });
  },
);

notificationsRouter.post(
  "/",
  validateBody(postNotificationBody),
  async (req, res) => {
    const supabase = getSupabase();
    if (!supabase) {
      serviceUnavailable(res, "Notifications store");
      return;
    }

    const { wallet_address, type, title, message, action_url, data: payload } =
      req.body;

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        wallet_address,
        type,
        title,
        message,
        action_url: action_url ?? null,
        data: payload ?? {},
      })
      .select("id")
      .single();

    if (error) {
      internalError(res);
      return;
    }

    res.status(201).json({ id: data.id });
  },
);
