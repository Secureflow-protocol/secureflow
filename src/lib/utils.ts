import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts an attachment markdown tag from description / cover-letter text.
 * Handles both `[Attachment: name](url)` (milestones) and
 * `[Portfolio/Attachment: name](url)` (job applications).
 */
export function parseAttachment(text: string): { body: string; text: string; attachment?: { name: string; url: string } } {
  // Match either variant: [Attachment: …] or [Portfolio/Attachment: …]
  const re = /\[(?:Portfolio\/)?Attachment:\s*([^\]]+)\]\((https?:\/\/[^)]+)\)/i;
  const match = re.exec(text);
  if (!match) return { body: text, text };
  const body = text.replace(match[0], "").replace(/\n{3,}/g, "\n\n").trim();
  return {
    body,
    text: body,
    attachment: { name: match[1].trim(), url: match[2].trim() },
  };
}
