import { parquetRead } from "hyparquet";
import type { PairData } from "../types";

export interface UploadProgress {
  step: "parsing" | "uploading-json" | "done";
  percent: number;
  label: string;
}

function toNumber(val: unknown): number {
  if (typeof val === "bigint") return Number(val);
  if (typeof val === "number") return val;
  return 0;
}

export async function uploadPairData(
  file: File,
  uploaderEmail?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ pairData: PairData; pairCount: number; cardCount: number }> {
  const secret = process.env.NEXT_PUBLIC_UPLOAD_SECRET;
  if (!secret) {
    throw new Error("Upload secret not configured");
  }

  // Step 1: Parse parquet file client-side
  onProgress?.({ step: "parsing", percent: 10, label: "Parsing parquet file..." });

  const arrayBuffer = await file.arrayBuffer();
  const pairData: PairData = {};

  await parquetRead({
    file: arrayBuffer,
    onComplete: (data: unknown[][]) => {
      for (const row of data) {
        const leftName = String(row[0]);
        const rightName = String(row[1]);
        const [a, b] = [leftName, rightName].sort();
        const key = `${a}|||${b}`;
        pairData[key] = {
          w: Math.round(toNumber(row[2]) * 10000) / 10000,
          c: Math.round(toNumber(row[3])),
          l: Math.round(toNumber(row[4]) * 10000) / 10000,
          p: Math.round(toNumber(row[5]) * 10000) / 10000,
        };
      }
    },
  });

  const pairCount = Object.keys(pairData).length;
  const cardNames = new Set<string>();
  for (const key of Object.keys(pairData)) {
    const [a, b] = key.split("|||");
    cardNames.add(a);
    cardNames.add(b);
  }
  const cardCount = cardNames.size;

  onProgress?.({ step: "parsing", percent: 40, label: `Parsed ${pairCount.toLocaleString()} pairs. Uploading...` });

  // Step 2: Get presigned URL from server
  onProgress?.({ step: "uploading-json", percent: 50, label: "Preparing upload..." });

  const urlRes = await fetch("/api/upload-url", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!urlRes.ok) {
    const err = await urlRes.json().catch(() => ({}));
    throw new Error(`Failed to get upload URL: ${urlRes.status} ${err.error || ""}`);
  }

  const { url } = await urlRes.json();

  // Step 3: Upload JSON directly to R2 via presigned URL
  onProgress?.({ step: "uploading-json", percent: 60, label: "Uploading to storage..." });

  const uploadRes = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pairData),
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload to storage failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  onProgress?.({ step: "done", percent: 100, label: "Complete!" });

  return { pairData, pairCount, cardCount };
}
