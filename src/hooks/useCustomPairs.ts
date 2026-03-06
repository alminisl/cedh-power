import { useState, useCallback } from "react";
import type { PairData, PairStats } from "../types";

const STORAGE_KEY = "cedh-custom-pairs";

function normalizePairKey(cardA: string, cardB: string): string {
  const [a, b] = [cardA.trim(), cardB.trim()].sort();
  return `${a}|||${b}`;
}

function loadCustomPairs(): PairData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCustomPairs(pairs: PairData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pairs));
}

export function useCustomPairs() {
  const [customPairs, setCustomPairs] = useState<PairData>(loadCustomPairs);

  const addPair = useCallback((cardA: string, cardB: string, stats: PairStats) => {
    const key = normalizePairKey(cardA, cardB);
    setCustomPairs((prev) => {
      const next = { ...prev, [key]: stats };
      saveCustomPairs(next);
      return next;
    });
  }, []);

  const addPairsBulk = useCallback((pairsObj: PairData) => {
    setCustomPairs((prev) => {
      const next = { ...prev, ...pairsObj };
      saveCustomPairs(next);
      return next;
    });
  }, []);

  const removePair = useCallback((key: string) => {
    setCustomPairs((prev) => {
      const next = { ...prev };
      delete next[key];
      saveCustomPairs(next);
      return next;
    });
  }, []);

  const clearCustomPairs = useCallback(() => {
    setCustomPairs({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { customPairs, addPair, addPairsBulk, removePair, clearCustomPairs };
}
