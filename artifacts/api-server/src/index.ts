import { loadEnv, setAppEnv } from "./config/env";
import { bootstrapDatabase } from "./bootstrap-db.js";

async function main(): Promise<void> {
  try {
    const env = loadEnv();
    process.env.LOG_LEVEL = env.logLevel;
    setAppEnv(env);
    const { assertCloudUploadConfigured } = await import("./lib/object-storage.js");
    assertCloudUploadConfigured();

    await bootstrapDatabase();

    const { default: app } = await import("./app.js");
    const { logger } = await import("./lib/logger.js");

    const listenPort =
      Number(process.env.PORT) || env.port || 8080;

    const server = app.listen(listenPort, () => {
      console.log("Server started on port", listenPort);
      logger.info(
        { port: listenPort, nodeEnv: env.nodeEnv },
        "Server listening",
      );
    });

    server.on("error", (err: Error) => {
      console.error("HTTP server error:", err);
      process.exit(1);
    });
  } catch (err) {
    console.error("Fatal startup error:", err);
    process.exit(1);
  }
}

void main();
