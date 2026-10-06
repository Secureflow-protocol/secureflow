export type TransactionPhase =
  | "idle"
  | "building"
  | "signing"
  | "pending"
  | "success"
  | "failed";

export interface TransactionProgress {
  phase: TransactionPhase;
  txHash?: string;
}

export type TransactionProgressListener = (
  progress: TransactionProgress,
) => void;

export interface TransactionErrorGuidance {
  code?: number;
  title: string;
  message: string;
  action: string;
  retryable: boolean;
}

type ErrorGuidanceEntry = Omit<TransactionErrorGuidance, "code">;

const SECURE_FLOW_ERROR_GUIDANCE: Record<number, ErrorGuidanceEntry> = {
  1000: { title: "Already initialized", message: "This contract has already been initialized.", action: "Refresh the page and use the existing configuration.", retryable: false },
  1001: { title: "Fee too high", message: "The requested platform fee exceeds the contract limit.", action: "Use a lower fee and submit again.", retryable: false },
  1002: { title: "Not authorized", message: "Only the contract owner can perform this action.", action: "Connect the owner wallet or choose an action available to this account.", retryable: false },
  1003: { title: "Contract not initialized", message: "The contract is not initialized yet.", action: "Initialize the contract before continuing.", retryable: false },
  1100: { title: "Escrow not found", message: "The requested escrow does not exist.", action: "Refresh the escrow list and verify the escrow ID.", retryable: false },
  1101: { title: "Escrow not active", message: "This escrow is not active for the requested action.", action: "Refresh its status before continuing.", retryable: false },
  1102: { title: "Invalid escrow status", message: "The escrow is in a state that does not allow this action.", action: "Refresh the escrow and choose an action valid for its current state.", retryable: false },
  1103: { title: "Work already started", message: "Work has already started for this escrow.", action: "Refresh the escrow instead of starting it again.", retryable: false },
  1104: { title: "Work not started", message: "Work must be started before this action is available.", action: "Start work first, then retry the intended action.", retryable: false },
  1200: { title: "Job creation paused", message: "New job creation is currently paused.", action: "Wait for an administrator to resume job creation.", retryable: false },
  1201: { title: "Invalid duration", message: "The requested escrow duration is outside the allowed range.", action: "Choose a valid duration and submit again.", retryable: false },
  1202: { title: "Milestone mismatch", message: "The milestone count does not match the submitted milestone data.", action: "Review the milestone list and submit it again.", retryable: false },
  1203: { title: "Too many milestones", message: "This escrow contains more milestones than the contract allows.", action: "Reduce the milestone count.", retryable: false },
  1204: { title: "Too many arbiters", message: "This escrow contains more arbiters than the contract allows.", action: "Reduce the arbiter count.", retryable: false },
  1205: { title: "Invalid confirmations", message: "The required confirmation count is invalid for the selected arbiters.", action: "Choose a valid confirmation threshold.", retryable: false },
  1206: { title: "Token not whitelisted", message: "The selected token is not approved for escrow.", action: "Choose a whitelisted token or ask an administrator to whitelist it.", retryable: false },
  1300: { title: "Job is not open", message: "This escrow is not an open marketplace job.", action: "Refresh the listing and choose an open job.", retryable: false },
  1301: { title: "Job closed", message: "This job no longer accepts applications.", action: "Refresh the marketplace and choose another open job.", retryable: false },
  1302: { title: "Cannot apply to own job", message: "The job creator cannot apply as its freelancer.", action: "Use a different wallet or choose another job.", retryable: false },
  1303: { title: "Application limit reached", message: "This job has reached its application limit.", action: "Choose another open job.", retryable: false },
  1304: { title: "Depositor only", message: "Only the escrow depositor can perform this action.", action: "Connect the depositor wallet.", retryable: false },
  1305: { title: "Freelancer did not apply", message: "The selected freelancer has not applied to this job.", action: "Select an existing applicant.", retryable: false },
  1306: { title: "Already applied", message: "This wallet has already applied to the job.", action: "Refresh the application state instead of submitting again.", retryable: false },
  1400: { title: "Invalid milestone", message: "The requested milestone does not exist.", action: "Refresh the escrow and select a valid milestone.", retryable: false },
  1401: { title: "Milestone already submitted", message: "This milestone has already been submitted.", action: "Refresh the milestone state instead of submitting it again.", retryable: false },
  1402: { title: "Milestone not submitted", message: "This milestone has not been submitted for review.", action: "Submit the milestone before approving, rejecting, or disputing it.", retryable: false },
  1403: { title: "Milestone already processed", message: "This milestone has already been approved, rejected, or otherwise processed.", action: "Refresh the milestone state before taking another action.", retryable: false },
  1500: { title: "Nothing to refund", message: "No refundable balance is available.", action: "Refresh the escrow balance.", retryable: false },
  1501: { title: "Deadline not passed", message: "The escrow deadline has not passed yet.", action: "Wait until the deadline before requesting this refund.", retryable: false },
  1502: { title: "Emergency period not reached", message: "The emergency refund period has not elapsed.", action: "Wait until the emergency period is reached.", retryable: false },
  1503: { title: "Cannot refund", message: "The escrow cannot be refunded in its current state.", action: "Refresh the escrow and review the available resolution actions.", retryable: false },
  1504: { title: "Invalid extension", message: "The requested deadline extension is invalid.", action: "Choose a valid extension period.", retryable: false },
  1505: { title: "Cannot extend", message: "This escrow cannot be extended in its current state.", action: "Refresh the escrow and review its deadline state.", retryable: false },
  1600: { title: "Beneficiary only", message: "Only the escrow beneficiary can perform this action.", action: "Connect the beneficiary wallet.", retryable: false },
  1601: { title: "Not authorized", message: "This wallet is not authorized to perform the requested action.", action: "Connect the authorized wallet or choose an allowed action.", retryable: false },
  1700: { title: "Invalid amount", message: "The submitted amount is invalid.", action: "Review the amount and submit again.", retryable: false },
  1701: { title: "Invalid address", message: "One of the submitted Stellar addresses is invalid.", action: "Review the wallet or destination address.", retryable: false },
  1702: { title: "Invalid parameter", message: "One or more transaction parameters are invalid.", action: "Review the form values and submit again.", retryable: false },
  1703: { title: "Insufficient withdrawable balance", message: "The requested withdrawal exceeds the available balance.", action: "Lower the amount or refresh the withdrawable balance.", retryable: false },
  1704: { title: "No overdue request", message: "There is no overdue-resolution request for this escrow.", action: "Refresh the escrow before resolving an overdue request.", retryable: false },
  1705: { title: "No arbiters available", message: "No authorized arbiters are available for this action.", action: "Wait for an arbiter to become available or contact an administrator.", retryable: false },
  1800: { title: "Escrow not completed", message: "Ratings are only available after escrow completion.", action: "Complete the escrow before submitting a rating.", retryable: false },
  1801: { title: "Rating already submitted", message: "A rating has already been submitted for this escrow.", action: "Refresh the rating state instead of submitting again.", retryable: false },
  1802: { title: "Invalid rating", message: "The rating value is outside the allowed range.", action: "Choose a valid rating value.", retryable: false },
  1803: { title: "Depositor rating only", message: "Only the depositor can rate the freelancer.", action: "Connect the depositor wallet.", retryable: false },
  1804: { title: "Beneficiary rating only", message: "Only the beneficiary can rate the client.", action: "Connect the beneficiary wallet.", retryable: false },
  1805: { title: "Client rating already submitted", message: "The client has already been rated for this escrow.", action: "Refresh the rating state instead of submitting again.", retryable: false },
};

export class PendingTransactionError extends Error {
  constructor(public readonly txHash: string) {
    super("Transaction is still pending on-chain.");
    this.name = "PendingTransactionError";
  }
}

export function extractSecureFlowErrorCode(
  error: unknown,
): number | undefined {
  const message = error instanceof Error ? error.message : String(error ?? "");
  for (const match of message.matchAll(/\b(1[0-8]\d{2})\b/g)) {
    const code = Number(match[1]);
    if (SECURE_FLOW_ERROR_GUIDANCE[code]) return code;
  }
  return undefined;
}

export function getTransactionErrorGuidance(
  error: unknown,
): TransactionErrorGuidance {
  if (error instanceof PendingTransactionError) {
    return {
      title: "Transaction still pending",
      message: "The transaction was broadcast but did not reach a final state before the confirmation timeout.",
      action: "Check its on-chain status before retrying.",
      retryable: false,
    };
  }

  const code = extractSecureFlowErrorCode(error);
  if (code) return { code, ...SECURE_FLOW_ERROR_GUIDANCE[code] };

  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("user declined") ||
    lower.includes("user cancelled") ||
    lower.includes("user canceled")
  ) {
    return {
      title: "Signature cancelled",
      message: "The wallet signature was cancelled before submission.",
      action: "Retry when you are ready to approve the wallet request.",
      retryable: true,
    };
  }

  if (
    lower.includes("try_again_later") ||
    lower.includes("try again later") ||
    lower.includes("should be retried later")
  ) {
    return {
      title: "RPC temporarily unavailable",
      message: "The Stellar RPC asked the client to retry later and did not accept the transaction.",
      action: "Retry the transaction.",
      retryable: true,
    };
  }

  if (
    lower.includes("timeout") ||
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("connection") ||
    lower.includes("503") ||
    lower.includes("504")
  ) {
    return {
      title: "Network error",
      message: "The network request did not complete cleanly.",
      action: "Reconnect if needed. Retry only when no pending transaction hash is shown.",
      retryable: true,
    };
  }

  return {
    title: "Transaction failed",
    message: message || "The transaction could not be completed.",
    action: "Review the current escrow state before trying again.",
    retryable: false,
  };
}
