import type { Request, Response, NextFunction } from "express";
import { type ZodSchema } from "zod";

function formatError(errors: { path: (string | number)[]; message: string }[]) {
  return {
    error: "Validation failed",
    details: errors.map((e) => ({
      field: e.path.join(".") || "root",
      message: e.message,
    })),
  };
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(formatError(result.error.errors));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json(formatError(result.error.errors));
      return;
    }
    next();
  };
}
