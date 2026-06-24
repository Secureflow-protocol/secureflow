import { z } from "zod";

export const postGaslessApplyBody = z.object({
  signedTxXdr: z
    .string()
    .min(48, "signedTxXdr is too short to be valid XDR")
    .max(100_000, "signedTxXdr exceeds maximum allowed length"),
});
