import { useMemo, useState } from "react";
import { TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { aggregateCardStats } from "../lib/aggregateCardStats";
import { simulateSwap } from "../lib/deckAnalyzer";
import type { CardBreakdownItem, PairData, SwapResult } from "../types";
import CardTooltip from "./CardTooltip";

interface UpgradeSuggestionsProps {
  cards: string[];
  breakdown: CardBreakdownItem[];
  pairData: PairData;
  onApplySwap: (oldCard: string, newCard: string) => void;
}

export default function UpgradeSuggestions({
  cards,
  breakdown,
  pairData,
  onApplySwap,
}: UpgradeSuggestionsProps) {
  const [computing, setComputing] = useState(false);
  const [suggestions, setSuggestions] = useState<SwapResult[] | null>(null);

  const deckSet = useMemo(() => new Set(cards.map((c) => c.toLowerCase())), [cards]);

  const globalTopCards = useMemo(
    () =>
      aggregateCardStats(pairData)
        .filter((c) => !deckSet.has(c.name.toLowerCase()))
        .slice(0, 40)
        .map((c) => c.name),
    [pairData, deckSet]
  );

  function compute() {
    setComputing(true);
    // Defer heavy work so the loading spinner renders first.
    setTimeout(() => {
      // Worst 6 cards in the deck (highest avgPairPower = weakest synergy).
      const worst = [...breakdown]
        .sort((a, b) => b.avgPairPower - a.avgPairPower)
        .slice(0, 6)
        .map((c) => c.name);

      const results: SwapResult[] = [];
      for (const victim of worst) {
        for (const replacement of globalTopCards) {
          const result = simulateSwap(cards, victim, replacement, pairData);
          if (result.diff < -0.0001) results.push(result);
        }
      }

      results.sort((a, b) => a.diff - b.diff); // most negative diff = biggest improvement
      setSuggestions(results.slice(0, 5));
      setComputing(false);
    }, 0);
  }

  if (suggestions === null) {
    return (
      <div className="glass rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold">Upgrade Suggestions</span>
          <span className="text-xs text-text-muted hidden sm:block">
            Find the top swaps that improve your power rank
          </span>
        </div>
        <button
          onClick={compute}
          disabled={computing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-light text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0"
        >
          {computing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <TrendingUp className="w-3 h-3" />
          )}
          {computing ? "Computing…" : "Find Upgrades"}
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold">Top Upgrade Suggestions</span>
        </div>
        <button
          onClick={() => { setSuggestions(null); compute(); }}
          className="text-text-muted hover:text-text transition-colors cursor-pointer"
          title="Recompute"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-text-muted">
          No improvements found — your deck is already well-optimised for the current dataset.
        </p>
      ) : (
        <div className="space-y-1.5">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onApplySwap(s.oldCard, s.newCard)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-bg border border-border hover:border-accent transition-colors cursor-pointer text-left group"
            >
              <span className="text-xs text-text-muted font-mono w-4 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0 flex items-center gap-2 text-sm overflow-hidden">
                <CardTooltip cardName={s.oldCard}>
                  <span className="text-text-muted line-through truncate max-w-[140px]">
                    {s.oldCard}
                  </span>
                </CardTooltip>
                <span className="text-text-muted shrink-0">→</span>
                <CardTooltip cardName={s.newCard}>
                  <span className="text-text font-medium truncate max-w-[140px] group-hover:text-accent transition-colors">
                    {s.newCard}
                  </span>
                </CardTooltip>
              </div>
              <span className="text-green-400 font-mono text-xs shrink-0">
                {s.diff.toFixed(4)}
              </span>
            </button>
          ))}
          <p className="text-xs text-text-muted pt-1">
            Click a suggestion to apply the swap immediately.
          </p>
        </div>
      )}
    </div>
  );
}
