import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * ESM-only (`import` / `export default`). Loads `.env` when present (local CLI).
 * Render injects `DATABASE_URL`; placeholder avoids failing config parse without DB.
 */
const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  "postgresql://127.0.0.1:5432/postgres";

export default defineConfig({
  schema: path.join(configDir, "src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
