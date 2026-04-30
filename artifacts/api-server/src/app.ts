import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import { getAppEnv, isProduction } from "./config/env";

const app: Express = express();

const env = getAppEnv();

app.disable("x-powered-by");
app.set("trust proxy", 1);

/**
 * Resolve `artifacts/topping-nfc/dist/public` for static + SPA.
 * Render often uses a different `process.cwd()` or Root Directory than monorepo root — try several absolutes.
 * Optional override: set `FRONTEND_PUBLIC_DIR` to an absolute path (must contain `index.html`).
 */
function resolveFrontendPublicDir(): { dir: string | null; tried: string[] } {
  const bundleDir = path.dirname(fileURLToPath(import.meta.url));
  const tried: string[] = [];
  const candidates: string[] = [];
  const envOverride = process.env.FRONTEND_PUBLIC_DIR?.trim();
  if (envOverride) {
    candidates.push(path.resolve(envOverride));
  }
  candidates.push(
    path.resolve(process.cwd(), "artifacts", "topping-nfc", "dist", "public"),
    path.resolve(process.cwd(), "..", "topping-nfc", "dist", "public"),
    path.resolve(bundleDir, "..", "..", "topping-nfc", "dist", "public"),
  );
  const unique = [...new Set(candidates)];
  for (const dir of unique) {
    tried.push(dir);
    if (fs.existsSync(path.join(dir, "index.html"))) {
      return { dir, tried: unique };
    }
  }
  return { dir: null, tried: unique };
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", router);

const { dir: publicDir, tried: publicDirCandidates } =
  resolveFrontendPublicDir();
if (publicDir) {
  logger.info(
    {
      publicDir,
      cwd: process.cwd(),
      tried: publicDirCandidates,
    },
    "Serving Vite app (static + SPA fallback)",
  );
  app.use(
    express.static(publicDir, {
      index: "index.html",
      setHeaders(res, absPath) {
        const base = path.basename(absPath);
        if (base === "index.html" || absPath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
          res.setHeader("Pragma", "no-cache");
          return;
        }
        if (absPath.includes(`${path.sep}assets${path.sep}`) || absPath.includes("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
  // Express 5 / path-to-regexp v8: bare "*" is invalid; use named splat for SPA fallback.
  app.get("/{*splat}", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
} else if (isProduction()) {
  logger.warn(
    {
      cwd: process.cwd(),
      tried: publicDirCandidates,
      hint: "Build topping-nfc before api-server, set Render root to monorepo, or set FRONTEND_PUBLIC_DIR to the folder that contains index.html",
    },
    "Frontend build not found; only /health and /api are served",
  );
}

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  const message =
    err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({
    error: isProduction() ? "Internal server error" : message,
  });
});

export default app;
