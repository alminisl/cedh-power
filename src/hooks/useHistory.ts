import { useState, useCallback } from "react";
import type { DeckAnalysis, HistoryEntry } from "../types";

const STORAGE_KEY = "cedh-power-history";
const MAX_ENTRIES = 50;

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  const addEntry = useCallback((results: DeckAnalysis, commander: string, cards: string[]) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      cardCount: results.cardBreakdown.length,
      averagePairPower: results.averagePairPower,
      firstCards: results.cardBreakdown.slice(0, 3).map((c) => c.name),
      commander: commander || null,
      cards: cards,
    };

    setHistory((prev) => {
      const withoutDupe = entry.commander
        ? prev.filter((e) => e.commander !== entry.commander)
        : prev;
      const next = [entry, ...withoutDupe].slice(0, MAX_ENTRIES);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addEntry, clearHistory };
}
