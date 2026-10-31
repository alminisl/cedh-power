import { createHash } from "crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "./r2";
import type { PairData } from "../types";

// pairData.json is ~14MB; keep one copy in memory per server process.
// Short TTL so a new admin upload shows up within a few minutes; `force` skips it.
const CACHE_TTL_MS = 5 * 60 * 1000;

interface Cached {
  body: string;
  etag: string;
  ts: number;
  parsed?: PairData;
}
let cached: Cached | null = null;

export async function getPairDataRaw(force = false): Promise<Cached | null> {
  if (cached && !force && Date.now() - cached.ts < CACHE_TTL_MS) return cached;
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: "pairData.json" }));
    const body = await res.Body?.transformToString();
    if (body) {
      const etag = `"${createHash("sha1").update(body).digest("hex")}"`;
      // Keep the parsed copy if the content didn't change.
      cached = { body, etag, ts: Date.now(), parsed: cached?.etag === etag ? cached.parsed : undefined };
    }
  } catch {
    // Serve the last good copy if R2 is unreachable.
  }
  return cached;
}

export async function getPairData(force = false): Promise<PairData | null> {
  const raw = await getPairDataRaw(force);
  if (!raw) return null;
  raw.parsed ??= JSON.parse(raw.body) as PairData;
  return raw.parsed;
}
