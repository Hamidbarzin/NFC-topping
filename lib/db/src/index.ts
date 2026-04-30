import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

function getPool(): pg.Pool {
  const cs = process.env.DATABASE_URL?.trim();
  if (!cs) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  if (!poolInstance) {
    poolInstance = new Pool({ connectionString: cs });
  }
  return poolInstance;
}

export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop, receiver) {
    if (prop === "then") return undefined;
    return Reflect.get(getPool(), prop, receiver);
  },
});

let dbInstance: NodePgDatabase<typeof schema> | null = null;

function getDb(): NodePgDatabase<typeof schema> {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    if (prop === "then") return undefined;
    return Reflect.get(getDb(), prop, receiver);
  },
});

export * from "./schema";
