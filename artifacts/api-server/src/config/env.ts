const isProd = process.env.NODE_ENV === "production";

export type AppEnv = {
  nodeEnv: string;
  port: number;
  databaseUrl: string | undefined;
  corsOrigins: string[];
  adminEmail: string | undefined;
  smtp: {
    host: string | undefined;
    port: number | undefined;
    user: string | undefined;
    pass: string | undefined;
    from: string | undefined;
  };
  appBaseUrl: string | undefined;
  logLevel: string;
};

const DEFAULT_PORT = 8080;

function parsePort(raw: string | undefined): number {
  if (!raw?.trim()) {
    console.warn(`[env] PORT not set — defaulting to ${DEFAULT_PORT}.`);
    return DEFAULT_PORT;
  }
  const port = Number(raw);
  if (Number.isNaN(port) || port <= 0) {
    console.warn(
      `[env] Invalid PORT "${raw}" — defaulting to ${DEFAULT_PORT}.`,
    );
    return DEFAULT_PORT;
  }
  return port;
}

function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [
      "http://localhost:18537",
      "http://127.0.0.1:18537",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Loads env with safe defaults. Does not throw on missing optional values.
 */
export function loadEnv(): AppEnv {
  const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;
  if (!databaseUrl) {
    console.warn(
      "[env] DATABASE_URL is not set — database routes will fail until configured.",
    );
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: parsePort(process.env.PORT),
    databaseUrl,
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
    adminEmail: process.env.ADMIN_EMAIL?.trim() || undefined,
    smtp: {
      host: process.env.SMTP_HOST?.trim() || undefined,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
      user: process.env.SMTP_USER?.trim() || undefined,
      pass: process.env.SMTP_PASS?.trim() || undefined,
      from: process.env.SMTP_FROM?.trim() || undefined,
    },
    appBaseUrl: process.env.APP_BASE_URL?.replace(/\/$/, "") || undefined,
    logLevel: process.env.LOG_LEVEL ?? "info",
  };
}

export function isProduction(): boolean {
  return isProd;
}

let cachedEnv: AppEnv | null = null;

export function setAppEnv(env: AppEnv): void {
  cachedEnv = env;
}

export function getAppEnv(): AppEnv {
  if (!cachedEnv) {
    throw new Error("Application environment was not initialized (setAppEnv not called).");
  }
  return cachedEnv;
}
