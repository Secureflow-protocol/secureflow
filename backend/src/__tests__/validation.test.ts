import { describe, it, expect } from "vitest";
import { postMessageBody, getConversationQuery, getInboxQuery } from "../schemas/messages.js";
import {
  getNotificationsQuery,
  postNotificationBody,
  patchNotificationReadParams,
} from "../schemas/notifications.js";
import { postMilestonesBody, postCoverLetterBody, postRewriteBody } from "../schemas/ai.js";
import { postGaslessApplyBody } from "../schemas/gasless.js";
import { uploadMilestoneBody } from "../schemas/upload.js";

const VALID_ADDR_A = "G" + "A".repeat(55);
const VALID_ADDR_B = "G" + "B".repeat(55);
const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

// ── messages ─────────────────────────────────────────────────────────────────

describe("postMessageBody", () => {
  it("accepts valid payload", () => {
    const result = postMessageBody.safeParse({
      sender_address: VALID_ADDR_A,
      recipient_address: VALID_ADDR_B,
      content: "hello",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing content", () => {
    const result = postMessageBody.safeParse({
      sender_address: VALID_ADDR_A,
      recipient_address: VALID_ADDR_B,
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects self-messaging", () => {
    const result = postMessageBody.safeParse({
      sender_address: VALID_ADDR_A,
      recipient_address: VALID_ADDR_A,
      content: "hi",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid Stellar address format", () => {
    const result = postMessageBody.safeParse({
      sender_address: "notastellaraddress",
      recipient_address: VALID_ADDR_B,
      content: "hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects content exceeding 4000 chars", () => {
    const result = postMessageBody.safeParse({
      sender_address: VALID_ADDR_A,
      recipient_address: VALID_ADDR_B,
      content: "x".repeat(4001),
    });
    expect(result.success).toBe(false);
  });
});

describe("getConversationQuery", () => {
  it("accepts valid a, b addresses", () => {
    const result = getConversationQuery.safeParse({ a: VALID_ADDR_A, b: VALID_ADDR_B });
    expect(result.success).toBe(true);
  });

  it("rejects invalid address for a", () => {
    const result = getConversationQuery.safeParse({ a: "bad", b: VALID_ADDR_B });
    expect(result.success).toBe(false);
  });

  it("accepts optional since as ISO datetime", () => {
    const result = getConversationQuery.safeParse({
      a: VALID_ADDR_A,
      b: VALID_ADDR_B,
      since: "2024-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects since as non-datetime string", () => {
    const result = getConversationQuery.safeParse({
      a: VALID_ADDR_A,
      b: VALID_ADDR_B,
      since: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("getInboxQuery", () => {
  it("accepts valid wallet", () => {
    expect(getInboxQuery.safeParse({ wallet: VALID_ADDR_A }).success).toBe(true);
  });

  it("rejects wallet starting with wrong character", () => {
    expect(getInboxQuery.safeParse({ wallet: "XABC" + "D".repeat(52) }).success).toBe(false);
  });

  it("rejects missing wallet", () => {
    expect(getInboxQuery.safeParse({}).success).toBe(false);
  });
});

// ── notifications ─────────────────────────────────────────────────────────────

describe("getNotificationsQuery", () => {
  it("accepts valid 56-char G-address", () => {
    expect(getNotificationsQuery.safeParse({ wallet: VALID_ADDR_A }).success).toBe(true);
  });

  it("rejects wallet that only starts with G but is too short", () => {
    expect(getNotificationsQuery.safeParse({ wallet: "GABC" }).success).toBe(false);
  });
});

describe("postNotificationBody", () => {
  it("accepts valid payload", () => {
    const result = postNotificationBody.safeParse({
      wallet_address: VALID_ADDR_A,
      type: "payment",
      title: "Payment received",
      message: "You received 100 XLM",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing type", () => {
    const result = postNotificationBody.safeParse({
      wallet_address: VALID_ADDR_A,
      title: "hello",
      message: "world",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding 200 chars", () => {
    const result = postNotificationBody.safeParse({
      wallet_address: VALID_ADDR_A,
      type: "t",
      title: "x".repeat(201),
      message: "msg",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid action_url", () => {
    const result = postNotificationBody.safeParse({
      wallet_address: VALID_ADDR_A,
      type: "t",
      title: "t",
      message: "m",
      action_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("patchNotificationReadParams", () => {
  it("accepts valid UUID", () => {
    expect(patchNotificationReadParams.safeParse({ id: VALID_UUID }).success).toBe(true);
  });

  it("rejects non-UUID string", () => {
    expect(patchNotificationReadParams.safeParse({ id: "not-a-uuid" }).success).toBe(false);
  });
});

// ── AI ────────────────────────────────────────────────────────────────────────

describe("postMilestonesBody", () => {
  it("accepts valid payload with userPrompt", () => {
    const result = postMilestonesBody.safeParse({ userPrompt: "build a login page" });
    expect(result.success).toBe(true);
  });

  it("rejects missing userPrompt", () => {
    expect(postMilestonesBody.safeParse({}).success).toBe(false);
  });

  it("rejects userPrompt over 2000 chars", () => {
    expect(postMilestonesBody.safeParse({ userPrompt: "x".repeat(2001) }).success).toBe(false);
  });

  it("applies default empty strings for optional fields", () => {
    const result = postMilestonesBody.safeParse({ userPrompt: "test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectTitle).toBe("");
      expect(result.data.milestoneIndex).toBeNull();
    }
  });
});

describe("postCoverLetterBody", () => {
  it("accepts valid payload", () => {
    const result = postCoverLetterBody.safeParse({ jobDescription: "Build a REST API" });
    expect(result.success).toBe(true);
  });

  it("rejects missing jobDescription", () => {
    expect(postCoverLetterBody.safeParse({ jobTitle: "Dev" }).success).toBe(false);
  });
});

describe("postRewriteBody", () => {
  it("accepts valid text", () => {
    expect(postRewriteBody.safeParse({ text: "Some project description" }).success).toBe(true);
  });

  it("rejects empty text", () => {
    expect(postRewriteBody.safeParse({ text: "" }).success).toBe(false);
  });

  it("rejects text over 5000 chars", () => {
    expect(postRewriteBody.safeParse({ text: "x".repeat(5001) }).success).toBe(false);
  });
});

// ── gasless ───────────────────────────────────────────────────────────────────

describe("postGaslessApplyBody", () => {
  it("accepts valid XDR string", () => {
    const result = postGaslessApplyBody.safeParse({ signedTxXdr: "A".repeat(100) });
    expect(result.success).toBe(true);
  });

  it("rejects signedTxXdr shorter than 48 chars", () => {
    expect(postGaslessApplyBody.safeParse({ signedTxXdr: "short" }).success).toBe(false);
  });

  it("rejects missing signedTxXdr", () => {
    expect(postGaslessApplyBody.safeParse({}).success).toBe(false);
  });
});

// ── upload ────────────────────────────────────────────────────────────────────

describe("uploadMilestoneBody", () => {
  it("accepts valid escrow_id and milestone_index", () => {
    const result = uploadMilestoneBody.safeParse({ escrow_id: "esc-123", milestone_index: "2" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.milestone_index).toBe(2);
    }
  });

  it("applies defaults when fields are missing", () => {
    const result = uploadMilestoneBody.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.escrow_id).toBe("unknown");
      expect(result.data.milestone_index).toBe(0);
    }
  });

  it("rejects negative milestone_index", () => {
    expect(uploadMilestoneBody.safeParse({ milestone_index: "-1" }).success).toBe(false);
  });
});
