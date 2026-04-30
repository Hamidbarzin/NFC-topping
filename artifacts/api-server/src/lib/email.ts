import nodemailer from "nodemailer";
import { getAppEnv, type AppEnv } from "../config/env";
import { logger } from "./logger";

export type ActivationEmailPayload = {
  cardCode: string;
  fullName: string;
  businessName: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  address: string;
  activatedAtIso: string;
};

function isSmtpConfigured(env: AppEnv): boolean {
  return Boolean(
    env.smtp.host &&
      env.smtp.port &&
      env.smtp.user &&
      env.smtp.pass &&
      env.adminEmail,
  );
}

export async function sendAdminActivationEmail(
  payload: ActivationEmailPayload,
): Promise<void> {
  const env = getAppEnv();
  if (!env.adminEmail) {
    logger.warn(
      { cardCode: payload.cardCode },
      "ADMIN_EMAIL not set; skipping activation notification email",
    );
    return;
  }

  if (!isSmtpConfigured(env)) {
    logger.warn(
      { cardCode: payload.cardCode },
      "SMTP not fully configured; skipping activation notification email",
    );
    return;
  }

  const subject = "New NFC Card Activation - Topping Courier";
  const text = [
    "A new NFC card was activated.",
    "",
    `Card code: ${payload.cardCode}`,
    `Full name: ${payload.fullName}`,
    `Business name: ${payload.businessName}`,
    `Phone: ${payload.phone}`,
    `Email: ${payload.email}`,
    `Website: ${payload.website}`,
    `Instagram: ${payload.instagram}`,
    `Address: ${payload.address}`,
    `Activation time: ${payload.activatedAtIso}`,
  ].join("\n");

  try {
    const transport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });

    await transport.sendMail({
      from: env.smtp.from ?? env.smtp.user,
      to: env.adminEmail,
      subject,
      text,
    });

    logger.info(
      { cardCode: payload.cardCode, to: env.adminEmail },
      "Activation notification email sent",
    );
  } catch (err) {
    logger.error(
      { err, cardCode: payload.cardCode },
      "Failed to send activation notification email (activation still succeeded)",
    );
  }
}
