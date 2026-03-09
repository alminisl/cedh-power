import { parseParquetFile } from "./parseParquet";
import type { PairData } from "../types";

const WORKER_URL = "https://bucket.cedhpower.com";
const UPLOAD_SECRET = import.meta.env.VITE_UPLOAD_SECRET;

export interface UploadProgress {
  step: "parsing" | "uploading-json" | "uploading-parquet" | "done";
  percent: number; // 0-100
  label: string;
}

export async function uploadPairData(
  file: File,
  uploaderEmail?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ pairData: PairData; pairCount: number; cardCount: number }> {
  if (!UPLOAD_SECRET) {
    throw new Error("Upload secret not configured");
  }

  // Step 1: Parse parquet (0-50%)
  onProgress?.({ step: "parsing", percent: 10, label: "Parsing parquet file..." });
  const pairData = await parseParquetFile(file);

  const pairCount = Object.keys(pairData).length;
  const cardNames = new Set<string>();
  for (const key of Object.keys(pairData)) {
    const [a, b] = key.split("|||");
    cardNames.add(a);
    cardNames.add(b);
  }
  const cardCount = cardNames.size;
  onProgress?.({ step: "parsing", percent: 50, label: `Parsed ${pairCount.toLocaleString()} pairs` });

  // Step 2: Upload JSON (50-80%)
  onProgress?.({ step: "uploading-json", percent: 55, label: "Uploading JSON data..." });
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
  onProgress?.({ step: "uploading-json", percent: 80, label: "JSON uploaded" });

  // Step 3: Upload raw parquet (80-100%)
  onProgress?.({ step: "uploading-parquet", percent: 85, label: "Uploading parquet backup..." });
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

  onProgress?.({ step: "done", percent: 100, label: "Complete!" });
  return { pairData, pairCount, cardCount };
}
