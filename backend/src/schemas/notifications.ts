import { z } from "zod";

const STELLAR_ADDR = /^G[A-Z0-9]{55}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const stellarWallet = z
  .string()
  .regex(STELLAR_ADDR, "must be a valid Stellar G-address");

export const getNotificationsQuery = z.object({
  wallet: stellarWallet,
});

export const patchNotificationReadQuery = z.object({
  wallet: stellarWallet,
});

export const patchNotificationReadParams = z.object({
  id: z.string().regex(UUID_RE, "Invalid notification id"),
});

export const postNotificationBody = z.object({
  wallet_address: stellarWallet,
  type: z.string().min(1, "type is required").max(50),
  title: z.string().min(1, "title is required").max(200),
  message: z.string().min(1, "message is required").max(1000),
  action_url: z.string().url("action_url must be a valid URL").optional().nullable(),
  data: z.record(z.unknown()).optional(),
});
