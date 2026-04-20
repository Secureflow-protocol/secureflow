/** Local SecureFlow API default when VITE_API_URL is omitted (dev only). */
const DEFAULT_DEV_API_URL = "http://localhost:8787";

function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  const trimmed = raw?.trim().replace(/\/$/, "") ?? "";
  if (trimmed) return trimmed;
  if (import.meta.env.DEV) return DEFAULT_DEV_API_URL;
  return "";
}

const apiSecret = () =>
  (import.meta.env.VITE_API_SECRET as string | undefined) ?? "";

function authHeaders(): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const secret = apiSecret();
  if (secret) {
    h.Authorization = `Bearer ${secret}`;
  }
  return h;
}

export function isApiConfigured(): boolean {
  return Boolean(getApiBase());
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = getApiBase();
  if (!base) {
    throw new Error("VITE_API_URL is not set (required for production builds)");
  }
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const errBody = await res.text();
    let message = res.statusText;
    try {
      const j = JSON.parse(errBody) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      if (errBody) message = errBody;
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function postMilestoneSuggestions(body: {
  projectTitle: string;
  projectDescription: string;
  totalBudget: string;
  durationDays: string;
  userPrompt: string;
  milestoneIndex: number | null;
}): Promise<{ suggestions: string[] }> {
  return apiFetch("/v1/ai/milestones", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postCoverLetterDraft(body: {
  jobTitle: string;
  jobDescription: string;
  proposedTimelineDays?: string;
  tone?: string;
}): Promise<{ coverLetter: string }> {
  return apiFetch("/v1/ai/cover-letter", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postRewriteText(body: { text: string }): Promise<{
  text: string;
}> {
  return apiFetch("/v1/ai/rewrite", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type RemoteNotificationRow = {
  id: string;
  type: "milestone" | "dispute" | "escrow" | "application";
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
};

export async function getNotifications(wallet: string): Promise<
  RemoteNotificationRow[]
> {
  const q = new URLSearchParams({ wallet });
  const json = await apiFetch<{ notifications: RemoteNotificationRow[] }>(
    `/v1/notifications?${q.toString()}`,
    { method: "GET" },
  );
  return json.notifications ?? [];
}

export async function patchNotificationRead(
  wallet: string,
  id: string,
): Promise<void> {
  const q = new URLSearchParams({ wallet });
  await apiFetch(`/v1/notifications/${encodeURIComponent(id)}/read?${q.toString()}`, {
    method: "PATCH",
  });
}

export async function postNotification(body: {
  wallet_address: string;
  type: "milestone" | "dispute" | "escrow" | "application";
  title: string;
  message: string;
  action_url?: string;
  data?: Record<string, unknown>;
}): Promise<{ id: string }> {
  return apiFetch("/v1/notifications", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const notificationIdIsRemote = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
