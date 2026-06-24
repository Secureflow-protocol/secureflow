import { Router } from "express";
import {
  generateCoverLetter,
  generateMilestoneSuggestions,
  rewriteProjectDescription,
} from "../lib/groq.js";
import { validateBody } from "../middleware/validate.js";
import {
  postMilestonesBody,
  postCoverLetterBody,
  postRewriteBody,
} from "../schemas/ai.js";

export const aiRouter = Router();

aiRouter.post("/milestones", validateBody(postMilestonesBody), async (req, res) => {
  try {
    const {
      projectTitle,
      projectDescription,
      totalBudget,
      durationDays,
      userPrompt,
      milestoneIndex,
    } = req.body;

    const suggestions = await generateMilestoneSuggestions({
      projectTitle,
      projectDescription,
      totalBudget,
      durationDays,
      userPrompt,
      milestoneIndex,
    });

    res.json({ suggestions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    const status = msg.includes("GROQ_API_KEY") ? 503 : 500;
    res.status(status).json({ error: status === 503 ? "AI service not configured" : "AI generation failed" });
  }
});

aiRouter.post("/cover-letter", validateBody(postCoverLetterBody), async (req, res) => {
  try {
    const { jobTitle, jobDescription, proposedTimelineDays, tone, userDraft } =
      req.body;

    const coverLetter = await generateCoverLetter({
      jobTitle,
      jobDescription,
      proposedTimelineDays,
      tone,
      userDraft,
    });

    res.json({ coverLetter });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    const status = msg.includes("GROQ_API_KEY") ? 503 : 500;
    res.status(status).json({ error: status === 503 ? "AI service not configured" : "AI generation failed" });
  }
});

aiRouter.post("/rewrite", validateBody(postRewriteBody), async (req, res) => {
  try {
    const { text } = req.body;
    const rewritten = await rewriteProjectDescription({ text });
    res.json({ text: rewritten });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI rewrite failed";
    const status = msg.includes("GROQ_API_KEY") ? 503 : 500;
    res.status(status).json({ error: status === 503 ? "AI service not configured" : "AI rewrite failed" });
  }
});
