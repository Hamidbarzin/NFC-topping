import type { Response } from "express";

export type ApiErrorBody = {
  error: string;
  code?: string;
  details?: unknown;
};

export function sendJsonError(
  res: Response,
  status: number,
  message: string,
  options?: { code?: string; details?: unknown },
): void {
  const body: ApiErrorBody = { error: message };
  if (options?.code) body.code = options.code;
  if (options?.details !== undefined) body.details = options.details;
  res.status(status).json(body);
}
