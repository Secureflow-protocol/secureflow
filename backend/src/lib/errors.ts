import type { Response } from "express";

export function internalError(res: Response): void {
  res.status(500).json({ error: "An internal error occurred" });
}

export function serviceUnavailable(res: Response, service: string): void {
  res.status(503).json({ error: `${service} is not configured` });
}
