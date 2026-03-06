import { parseParquetFile } from "./parseParquet";
import type { PairData } from "../types";

const WORKER_URL = import.meta.env.VITE_WORKER_URL;
const UPLOAD_SECRET = import.meta.env.VITE_UPLOAD_SECRET;

export async function uploadPairData(file: File): Promise<{ pairData: PairData; pairCount: number; cardCount: number }> {
  const pairData = await parseParquetFile(file);

  const pairCount = Object.keys(pairData).length;
  const cardNames = new Set<string>();
  for (const key of Object.keys(pairData)) {
    const [a, b] = key.split("|||");
    cardNames.add(a);
    cardNames.add(b);
  }

  // Upload to Cloudflare R2 via worker
  if (WORKER_URL && UPLOAD_SECRET) {
    const res = await fetch(`${WORKER_URL}/pair-data`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${UPLOAD_SECRET}`,
      },
      body: JSON.stringify(pairData),
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    }
  }

  return { pairData, pairCount, cardCount: cardNames.size };
}
