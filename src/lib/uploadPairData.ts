import { parseParquetFile } from "./parseParquet";
import type { PairData } from "../types";

const WORKER_URL = "https://bucket.cedhpower.com";
const UPLOAD_SECRET = import.meta.env.VITE_UPLOAD_SECRET;

export async function uploadPairData(
  file: File,
  uploaderEmail?: string
): Promise<{ pairData: PairData; pairCount: number; cardCount: number }> {
  if (!WORKER_URL || !UPLOAD_SECRET) {
    throw new Error("Worker URL or upload secret not configured");
  }

  // 1. Parse parquet file into pair data
  const pairData = await parseParquetFile(file);

  const pairCount = Object.keys(pairData).length;
  const cardNames = new Set<string>();
  for (const key of Object.keys(pairData)) {
    const [a, b] = key.split("|||");
    cardNames.add(a);
    cardNames.add(b);
  }
  const cardCount = cardNames.size;

  // 2. Upload parsed JSON — fully replaces pairData.json in R2
  const jsonRes = await fetch(`${WORKER_URL}/pair-data`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${UPLOAD_SECRET}`,
    },
    body: JSON.stringify(pairData),
  });

  if (!jsonRes.ok) {
    throw new Error(`JSON upload failed: ${jsonRes.status} ${jsonRes.statusText}`);
  }

  // 3. Upload raw parquet file for version history (with metadata in headers)
  const parquetRes = await fetch(`${WORKER_URL}/parquet-version`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      Authorization: `Bearer ${UPLOAD_SECRET}`,
      "X-Original-Filename": file.name,
      "X-Pair-Count": String(pairCount),
      "X-Card-Count": String(cardCount),
      "X-Uploaded-By": uploaderEmail ?? "",
    },
    body: await file.arrayBuffer(),
  });

  if (!parquetRes.ok) {
    throw new Error(`Parquet upload failed: ${parquetRes.status} ${parquetRes.statusText}`);
  }

  return { pairData, pairCount, cardCount };
}
