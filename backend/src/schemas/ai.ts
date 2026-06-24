import { z } from "zod";

export const postMilestonesBody = z.object({
  projectTitle: z.string().max(200).default(""),
  projectDescription: z.string().max(5000).default(""),
  totalBudget: z.string().max(50).default(""),
  durationDays: z.string().max(20).default(""),
  userPrompt: z.string().min(1, "userPrompt is required").max(2000),
  milestoneIndex: z.number().int().nullable().default(null),
});

export const postCoverLetterBody = z.object({
  jobTitle: z.string().max(200).default(""),
  jobDescription: z.string().min(1, "jobDescription is required").max(5000),
  proposedTimelineDays: z.string().max(20).optional(),
  tone: z.string().max(50).optional(),
  userDraft: z.string().max(3000).optional(),
});

export const postRewriteBody = z.object({
  text: z.string().min(1, "text is required").max(5000),
});
