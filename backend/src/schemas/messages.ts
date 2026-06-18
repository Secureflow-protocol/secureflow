import { z } from "zod";

const STELLAR_ADDR = /^G[A-Z0-9]{55}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const stellarWallet = z
  .string()
  .regex(STELLAR_ADDR, "must be a valid Stellar G-address");

export const postMessageBody = z
  .object({
    sender_address: stellarWallet,
    recipient_address: stellarWallet,
    content: z.string().min(1, "content is required").max(4000),
  })
  .refine((d) => d.sender_address !== d.recipient_address, {
    message: "Cannot message yourself",
    path: ["recipient_address"],
  });

export const getConversationQuery = z.object({
  a: stellarWallet,
  b: stellarWallet,
  since: z.string().datetime({ offset: true }).optional(),
});

export const getInboxQuery = z.object({
  wallet: stellarWallet,
});

export const getUnreadCountQuery = z.object({
  wallet: stellarWallet,
});

export const patchConversationReadQuery = z.object({
  a: stellarWallet,
  b: stellarWallet,
  wallet: stellarWallet,
});

export const patchMessageReadParams = z.object({
  id: z.string().regex(UUID_RE, "Invalid message id"),
});

export const patchMessageReadQuery = z.object({
  wallet: stellarWallet,
});
