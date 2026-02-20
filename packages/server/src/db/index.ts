import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

const DB_PATH = resolve("./data/finance.db");

// Ensure data directory exists
const dir = dirname(DB_PATH);
if (!existsSync(dir)) {
	mkdirSync(dir, { recursive: true });
}

const client = createClient({
	url: `file:${DB_PATH}`,
});

// Enable foreign keys
await client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle(client, { schema });
