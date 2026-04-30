/**
 * Orval emits `lib/api-zod/src/index.ts` with multiple `export *` lines
 * (api + types + sometimes api.schemas), which re-export the same symbol
 * names and fail TypeScript with TS2308. We only need the Zod schemas barrel.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// scripts/ -> api-spec/ -> lib/ -> sibling api-zod/
const indexFile = path.resolve(here, "..", "..", "api-zod", "src", "index.ts");

const content = `export * from "./generated/api";
`;

fs.writeFileSync(indexFile, content, "utf8");
console.log("[patch-api-zod-index] Wrote single export barrel:", indexFile);
