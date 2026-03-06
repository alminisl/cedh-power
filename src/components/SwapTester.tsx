import { useState, useMemo } from "react";
import { Search, ArrowRightLeft, Check, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { simulateSwap } from "../lib/deckAnalyzer";
import type { PairData, SwapResult } from "../types";
import CardTooltip from "./CardTooltip";

interface SwapTesterProps {
  cards: string[];
  pairData: PairData;
  selectedCard: string | null;
  onClearSelection: () => void;
  onConfirmSwap: (oldCard: string, newCard: string) => void;
}

export default function SwapTester({
  cards,
  pairData,
  selectedCard,
  onClearSelection,
  onConfirmSwap,
}: SwapTesterProps) {
  const [search, setSearch] = useState("");
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null);

  const allCardNames = useMemo(() => {
    const names = new Set<string>();
    for (const key of Object.keys(pairData)) {
      const [a, b] = key.split("|");
      names.add(a);
      names.add(b);
    }
    return Array.from(names).sort();
  }, [pairData]);

  const searchResults = useMemo(() => {
    if (!search || search.length < 2) return [];
    const lc = search.toLowerCase();
    const deckSet = new Set(cards.map((c) => c.toLowerCase()));
    return allCardNames
      .filter((name) => name.toLowerCase().includes(lc) && !deckSet.has(name.toLowerCase()))
      .slice(0, 10);
  }, [search, allCardNames, cards]);

  function handleTestSwap(newCard: string) {
    if (!selectedCard) return;
    const result = simulateSwap(cards, selectedCard, newCard, pairData);
    setSwapResult(result);
    setSearch("");
  }

  function handleConfirm() {
    if (!swapResult) return;
    onConfirmSwap(swapResult.oldCard, swapResult.newCard);
    setSwapResult(null);
    setSearch("");
  }

  function handleCancel() {
    setSwapResult(null);
    setSearch("");
    onClearSelection();
  }

  if (!selectedCard) {
    return (
      <div className="glass rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-text-muted">
          <ArrowRightLeft className="w-4 h-4" />
          <p className="text-sm">Click a card in the table below to test a swap</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 space-y-3 relative z-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold">Swap Tester</span>
        </div>
        <button
          onClick={handleCancel}
          className="text-text-muted hover:text-text transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">Replacing:</span>
        <CardTooltip cardName={selectedCard}>
          <span className="text-accent font-medium">{selectedCard}</span>
        </CardTooltip>
      </div>

      {!swapResult && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search any Magic card..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
          />
          {search.length >= 2 && searchResults.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((name) => (
                <button
                  key={name}
                  onClick={() => handleTestSwap(name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-light transition-colors cursor-pointer first:rounded-t-lg last:rounded-b-lg"
                >
                  <CardTooltip cardName={name}>{name}</CardTooltip>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {swapResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <CardTooltip cardName={swapResult.oldCard}>
              <span className="text-text-muted line-through">{swapResult.oldCard}</span>
            </CardTooltip>
            <ArrowRightLeft className="w-3 h-3 text-text-muted shrink-0" />
            <CardTooltip cardName={swapResult.newCard}>
              <span className="text-text font-medium">{swapResult.newCard}</span>
            </CardTooltip>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {swapResult.diff > 0.0001 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : swapResult.diff < -0.0001 ? (
                <TrendingDown className="w-4 h-4 text-red-400" />
              ) : (
                <Minus className="w-4 h-4 text-text-muted" />
              )}
              <span
                className={`text-lg font-bold font-mono ${
                  swapResult.diff > 0.0001
                    ? "text-green-400"
                    : swapResult.diff < -0.0001
                      ? "text-red-400"
                      : "text-text-muted"
                }`}
              >
                {swapResult.diff > 0 ? "+" : ""}
                {swapResult.diff.toFixed(4)}
              </span>
              <span className="text-xs text-text-muted">avg pair power</span>
            </div>

            <div className="text-xs text-text-muted font-mono">
              {swapResult.oldPower.toFixed(4)} → {swapResult.newPower.toFixed(4)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-light text-white transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Swap
            </button>
            <button
              onClick={() => setSwapResult(null)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-bg border border-border hover:border-accent text-text transition-colors cursor-pointer"
            >
              Try Another
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-1.5 rounded-lg text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
