import { z } from "zod";

function digitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

/** Accepts formatted phones; requires at least 7 numeric digits. */
export const phoneFieldSchema = z
  .string()
  .trim()
  .refine((s) => digitCount(s) >= 7, {
    message: "Enter at least 7 digits (you can use +, spaces, or dashes)",
  });
