import { Router, type IRouter } from "express";
import { randomInt, createHash } from "node:crypto";
import twilio from "twilio";
import { z } from "zod";
import { getAppEnv } from "../config/env";

type PendingCode = {
  codeHash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
};

const codes = new Map<string, PendingCode>();
const CODE_TTL_MS = 5 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const sendCodeSchema = z.object({
  userSlug: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
});

const verifyCodeSchema = z.object({
  userSlug: z.string().trim().min(2).max(120),
  code: z.string().trim().min(4).max(16),
});

function normalizeDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1728))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/\D/g, "");
}

function hashCode(code: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

function randomCode(): string {
  return String(randomInt(100000, 1_000_000));
}

const membershipRouter: IRouter = Router();

membershipRouter.post("/membership/send-code", async (req, res) => {
  const parsed = sendCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const { userSlug, phone } = parsed.data;
  const now = Date.now();
  const existing = codes.get(userSlug);

  if (existing && now - existing.lastSentAt < SEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((SEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    return res.status(429).json({ error: `Please wait ${waitSec}s before requesting another code.` });
  }

  const env = getAppEnv();
  if (!env.twilio.accountSid || !env.twilio.authToken || !env.twilio.fromNumber) {
    return res.status(500).json({ error: "Twilio is not configured on server." });
  }

  const code = randomCode();
  const salt = randomCode();
  const codeHash = hashCode(code, salt);
  const expiresAt = now + CODE_TTL_MS;

  const client = twilio(env.twilio.accountSid, env.twilio.authToken);
  await client.messages.create({
    from: env.twilio.fromNumber,
    to: phone,
    body: `Your Topping verification code is ${code}. It expires in 5 minutes.`,
  });

  codes.set(userSlug, {
    codeHash,
    salt,
    expiresAt,
    attempts: 0,
    lastSentAt: now,
  });

  return res.status(200).json({ ok: true, expiresInSec: CODE_TTL_MS / 1000 });
});

membershipRouter.post("/membership/verify-code", (req, res) => {
  const parsed = verifyCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const { userSlug, code } = parsed.data;
  const normalizedCode = normalizeDigits(code);
  if (!/^\d{6}$/.test(normalizedCode)) {
    return res.status(400).json({ error: "Code must be 6 digits." });
  }

  const entry = codes.get(userSlug);
  if (!entry) {
    return res.status(400).json({ error: "Code not found. Please request a new code." });
  }

  const now = Date.now();
  if (now > entry.expiresAt) {
    codes.delete(userSlug);
    return res.status(400).json({ error: "Code expired. Please request a new code." });
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    codes.delete(userSlug);
    return res.status(429).json({ error: "Too many attempts. Please request a new code." });
  }

  const valid = hashCode(normalizedCode, entry.salt) === entry.codeHash;
  if (!valid) {
    entry.attempts += 1;
    codes.set(userSlug, entry);
    return res.status(400).json({ error: "Invalid code." });
  }

  codes.delete(userSlug);
  return res.status(200).json({ ok: true });
});

export default membershipRouter;
