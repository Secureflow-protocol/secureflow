import { z } from "zod";

export const uploadMilestoneBody = z.object({
  escrow_id: z.string().min(1).max(200).default("unknown"),
  milestone_index: z.coerce.number().int().min(0).default(0),
});
