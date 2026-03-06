import { useState, useMemo } from "react";
import { Search, ArrowUpDown, Trophy, SlidersHorizontal } from "lucide-react";
import { aggregateCardStats } from "../lib/aggregateCardStats";
import type { PairData, CardStat } from "../types";
import CardTooltip from "../components/CardTooltip";

function getQuartileColor(value: number, min: number, max: number): string {
  const range = max - min;
  if (range === 0) return "bg-gray-500";
  const pct = (value - min) / range;
  if (pct >= 0.75) return "bg-green-500";
  if (pct >= 0.5) return "bg-emerald-500";
  if (pct >= 0.25) return "bg-amber-500";
  return "bg-red-500";
}

const PAGE_SIZE = 50;

type SortKey = keyof CardStat;

interface LeaderboardPageProps {
  pairData: PairData | null;
}

export default function LeaderboardPage({ pairData }: LeaderboardPageProps) {
  const [filter, setFilter] = useState("");
  const [minPairs, setMinPairs] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("avgPower");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  const allCards = useMemo(
    () => (pairData ? aggregateCardStats(pairData) : []),
    [pairData]
  );

  const { min, max } = useMemo(() => {
    if (allCards.length === 0) return { min: 0, max: 1 };
    const powers = allCards.map((c) => c.avgPower);
    return { min: Math.min(...powers), max: Math.max(...powers) };
  }, [allCards]);

  const maxPairs = useMemo(
    () => allCards.reduce((m, c) => Math.max(m, c.pairs), 0),
    [allCards]
  );

  const sorted = useMemo(() => {
    let filtered = allCards.filter((c) => c.pairs >= minPairs);
    if (filter) {
      const lc = filter.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(lc));
    }
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string")
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [allCards, filter, minPairs, sortKey, sortAsc]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageItems = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: "Card Name" },
    { key: "avgPower", label: "Avg Power" },
    { key: "totalPower", label: "Total Power" },
    { key: "pairs", label: "Pairs" },
    { key: "totalConf", label: "Total Conf" },
    { key: "totalLogMult", label: "Total LogMult" },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-bold">Card Leaderboard</h1>
        <span className="text-sm text-text-muted">
          {allCards.length} cards
        </span>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 max-w-xs min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search cards..."
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
              className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-text-muted shrink-0" />
            <label className="text-xs text-text-muted whitespace-nowrap">Min Pairs</label>
            <input
              type="range"
              min={1}
              max={maxPairs || 1}
              value={minPairs}
              onChange={(e) => {
                setMinPairs(Number(e.target.value));
                setPage(0);
              }}
              className="w-24 accent-accent"
            />
            <input
              type="number"
              min={1}
              max={maxPairs || 1}
              value={minPairs}
              onChange={(e) => {
                const v = Math.max(1, Math.min(maxPairs || 1, Number(e.target.value) || 1));
                setMinPairs(v);
                setPage(0);
              }}
              className="w-14 bg-bg border border-border rounded-lg px-2 py-1 text-sm text-text text-center focus:outline-none focus:border-accent transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <span className="text-xs text-text-muted">
            {sorted.length} result{sorted.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-8 py-2 text-left text-text-muted font-medium">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="py-2 text-left text-text-muted font-medium cursor-pointer hover:text-text transition-colors select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                ))}
                <th className="py-2 text-left text-text-muted font-medium w-32">
                  Power Bar
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((card, i) => {
                const rank = page * PAGE_SIZE + i + 1;
                const barWidth =
                  max > min
                    ? ((card.avgPower - min) / (max - min)) * 100
                    : 50;
                const percentile =
                  sorted.length > 1
                    ? Math.round(((sorted.length - rank) / (sorted.length - 1)) * 100)
                    : 100;

                return (
                  <tr
                    key={card.name}
                    className="border-b border-border/50 hover:bg-surface-light/50 transition-colors"
                  >
                    <td className="py-2 text-text-muted">{rank}</td>
                    <td className="py-2 font-medium">
                      <CardTooltip cardName={card.name}>
                        {card.name}
                      </CardTooltip>
                    </td>
                    <td className="py-2 font-mono">
                      {card.avgPower.toFixed(4)}
                    </td>
                    <td className="py-2 font-mono">
                      {card.totalPower.toFixed(2)}
                    </td>
                    <td className="py-2">{card.pairs}</td>
                    <td className="py-2 font-mono">
                      {card.totalConf.toLocaleString()}
                    </td>
                    <td className="py-2 font-mono">
                      {card.totalLogMult.toFixed(2)}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-bg rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all ${getQuartileColor(card.avgPower, min, max)}`}
                            style={{ width: `${Math.max(barWidth, 2)}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted font-mono w-10 text-right shrink-0">
                          {percentile}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm rounded bg-bg border border-border disabled:opacity-40 hover:border-accent transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-sm text-text-muted">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-sm rounded bg-bg border border-border disabled:opacity-40 hover:border-accent transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
