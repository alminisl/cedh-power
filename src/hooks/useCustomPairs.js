import { useState, useCallback } from "react";

const STORAGE_KEY = "cedh-custom-pairs";

function normalizePairKey(cardA, cardB) {
  const [a, b] = [cardA.trim(), cardB.trim()].sort();
  return `${a}|||${b}`;
}

function loadCustomPairs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCustomPairs(pairs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pairs));
}

export function useCustomPairs() {
  const [customPairs, setCustomPairs] = useState(loadCustomPairs);

  const addPair = useCallback((cardA, cardB, stats) => {
    const key = normalizePairKey(cardA, cardB);
    setCustomPairs((prev) => {
      const next = { ...prev, [key]: stats };
      saveCustomPairs(next);
      return next;
    });
  }, []);

  const addPairsBulk = useCallback((pairsObj) => {
    setCustomPairs((prev) => {
      const next = { ...prev, ...pairsObj };
      saveCustomPairs(next);
      return next;
    });
  }, []);

  const removePair = useCallback((key) => {
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
