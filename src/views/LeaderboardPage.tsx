import { useState, useMemo, useEffect } from "react";
import { Search, ArrowUpDown, Trophy, SlidersHorizontal, Swords } from "lucide-react";
import { aggregateCardStats } from "../lib/aggregateCardStats";
import { supabase } from "../lib/supabase";
import type { PairData, CardStat } from "../types";
import CardTooltip from "../components/CardTooltip";
import landNames from "../data/landNames.json";

const landNameSet = new Set<string>(landNames);

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
type Tab = "cards" | "commanders";

interface LeaderboardPageProps {
  pairData: PairData | null;
}

interface CommanderStat {
  commander: string;
  count: number;
  avgPower: number;
}

export default function LeaderboardPage({ pairData }: LeaderboardPageProps) {
  const [tab, setTab] = useState<Tab>("cards");

  // ── Card rankings state ──
  const [filter, setFilter] = useState("");
  const [minPairs, setMinPairs] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("avgPower");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [hideLands, setHideLands] = useState(false);

  // ── Commander meta state ──
  const [commanderStats, setCommanderStats] = useState<CommanderStat[]>([]);
  const [commanderFilter, setCommanderFilter] = useState("");
  const [commanderLoading, setCommanderLoading] = useState(false);
  const [commanderSortKey, setCommanderSortKey] = useState<"commander" | "count" | "avgPower">("avgPower");
  const [commanderSortAsc, setCommanderSortAsc] = useState(false);

  useEffect(() => {
    if (tab !== "commanders" || commanderStats.length > 0) return;
    setCommanderLoading(true);
    supabase
      .from("decklists")
      .select("commander, average_pair_power")
      .not("commander", "is", null)
      .limit(2000)
      .then(({ data }) => {
        if (!data) { setCommanderLoading(false); return; }
        const map: Record<string, { count: number; totalPower: number }> = {};
        for (const row of data) {
          const cmd = row.commander as string;
          if (!map[cmd]) map[cmd] = { count: 0, totalPower: 0 };
          map[cmd].count++;
          map[cmd].totalPower += row.average_pair_power ?? 0;
        }
        const stats: CommanderStat[] = Object.entries(map)
          .filter(([, s]) => s.count >= 1)
          .map(([commander, s]) => ({
            commander,
            count: s.count,
            avgPower: s.totalPower / s.count,
          }))
          .sort((a, b) => a.avgPower - b.avgPower); // lower = stronger
        setCommanderStats(stats);
        setCommanderLoading(false);
      });
  }, [tab, commanderStats.length]);

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
    if (hideLands) filtered = filtered.filter((c) => !landNameSet.has(c.name));
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
  }, [allCards, filter, hideLands, minPairs, sortKey, sortAsc]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageItems = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
    setPage(0);
  }

  const filteredCommanders = useMemo(() => {
    const lc = commanderFilter.toLowerCase();
    const list = lc
      ? commanderStats.filter((c) => c.commander.toLowerCase().includes(lc))
      : commanderStats;
    return [...list].sort((a, b) => {
      const av = a[commanderSortKey];
      const bv = b[commanderSortKey];
      if (typeof av === "string" && typeof bv === "string")
        return commanderSortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return commanderSortAsc
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [commanderStats, commanderFilter, commanderSortKey, commanderSortAsc]);

  function toggleCommanderSort(key: typeof commanderSortKey) {
    if (commanderSortKey === key) setCommanderSortAsc(!commanderSortAsc);
    else { setCommanderSortKey(key); setCommanderSortAsc(key === "avgPower" ? true : false); }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: "Card Name" },
    { key: "avgPower", label: "Avg Power" },
    { key: "pairs", label: "Pairs" },
    { key: "totalConf", label: "Total Conf" },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Trophy className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <span className="text-sm text-text-muted">{allCards.length} cards</span>

        {/* Tab switcher */}
        <div className="ml-auto flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-border">
          <button
            onClick={() => setTab("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              tab === "cards" ? "bg-accent text-white" : "text-text-muted hover:text-text"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => setTab("commanders")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              tab === "commanders" ? "bg-accent text-white" : "text-text-muted hover:text-text"
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            Commanders
          </button>
        </div>
      </div>

      {/* ── Card Rankings ── */}
      {tab === "cards" && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 max-w-xs min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search cards..."
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setPage(0); }}
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
                onChange={(e) => { setMinPairs(Number(e.target.value)); setPage(0); }}
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
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideLands}
                onChange={(e) => { setHideLands(e.target.checked); setPage(0); }}
                className="accent-accent w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-text-muted whitespace-nowrap">Hide Lands</span>
            </label>
            <span className="text-xs text-text-muted">
              {sorted.length} result{sorted.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-8 py-2 text-left text-text-muted font-medium">#</th>
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
                  <th className="py-2 text-left text-text-muted font-medium w-32">Power Bar</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((card, i) => {
                  const rank = page * PAGE_SIZE + i + 1;
                  const barWidth = max > min ? ((card.avgPower - min) / (max - min)) * 100 : 50;
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
                        <CardTooltip cardName={card.name}>{card.name}</CardTooltip>
                      </td>
                      <td className="py-2 font-mono">{card.avgPower.toFixed(4)}</td>
                      <td className="py-2">{card.pairs}</td>
                      <td className="py-2 font-mono">{card.totalConf.toLocaleString()}</td>
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
      )}

      {/* ── Commander Meta ── */}
      {tab === "commanders" && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 max-w-xs min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search commanders..."
                value={commanderFilter}
                onChange={(e) => setCommanderFilter(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <span className="text-xs text-text-muted">
              {filteredCommanders.length} commander{filteredCommanders.length !== 1 ? "s" : ""}
            </span>
          </div>

          {commanderLoading ? (
            <div className="flex items-center justify-center py-12 text-text-muted text-sm">
              Loading commander data…
            </div>
          ) : filteredCommanders.length === 0 ? (
            <p className="text-center text-sm text-text-muted py-8">
              No saved decks with commander data yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="w-8 py-2 text-left text-text-muted font-medium">#</th>
                    {(
                      [
                        { key: "commander" as const, label: "Commander" },
                        { key: "count" as const, label: "Decks" },
                        { key: "avgPower" as const, label: "Avg Power" },
                      ] as const
                    ).map((col) => (
                      <th
                        key={col.key}
                        onClick={() => toggleCommanderSort(col.key)}
                        className="py-2 text-left text-text-muted font-medium cursor-pointer hover:text-text transition-colors select-none"
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          <ArrowUpDown className="w-3 h-3" />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCommanders.map((cmd, i) => (
                    <tr
                      key={cmd.commander}
                      className="border-b border-border/50 hover:bg-surface-light/50 transition-colors"
                    >
                      <td className="py-2 text-text-muted">{i + 1}</td>
                      <td className="py-2 font-medium">{cmd.commander}</td>
                      <td className="py-2 text-text-muted">{cmd.count}</td>
                      <td className="py-2 font-mono">{cmd.avgPower.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
