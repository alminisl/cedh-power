import type { PairData } from "../types";

export function mergePairData(builtInData: PairData, customPairs: PairData): PairData {
  if (!customPairs || Object.keys(customPairs).length === 0) {
    return builtInData;
  }
  return { ...builtInData, ...customPairs };
}
