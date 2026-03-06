import { parseParquetFile } from "./parseParquet";
import type { PairData } from "../types";

export async function parsePairDataFromParquet(file: File): Promise<{ pairData: PairData; pairCount: number; cardCount: number }> {
  const pairData = await parseParquetFile(file);

  const pairCount = Object.keys(pairData).length;
  const cardNames = new Set<string>();
  for (const key of Object.keys(pairData)) {
    const [a, b] = key.split("|||");
    cardNames.add(a);
    cardNames.add(b);
  }

  return { pairData, pairCount, cardCount: cardNames.size };
}
