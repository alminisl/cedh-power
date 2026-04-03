import { useState, useMemo } from "react";
import { Search, ArrowUpDown, LayoutList, Columns2, List, Loader2 } from "lucide-react";
import type { CardBreakdownItem, ScryfallCardData } from "../types";
import CardTooltip from "./CardTooltip";
import CardModal from "./CardModal";

const TYPE_CATEGORIES = [
  "Commander",
  "Creature",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Planeswalker",
  "Battle",
  "Land",
  "Other",
] as const;

function getQuartileColor(pct: number): string {
  if (pct >= 75) return "bg-green-500";
  if (pct >= 50) return "bg-emerald-500";
  if (pct >= 25) return "bg-amber-500";
  return "bg-red-500";
}

type SortKey = keyof CardBreakdownItem;
type ViewMode = "table" | "columns" | "list";

interface CardBreakdownTableProps {
  breakdown: CardBreakdownItem[];
  selectedCard?: string | null;
  onSelectCard?: (name: string) => void;
  groupedCards?: Record<string, string[]> | null;
  typesLoading?: boolean;
  cardDataMap?: Map<string, ScryfallCardData>;
}

export default function CardBreakdownTable({ breakdown, selectedCard, onSelectCard, groupedCards, typesLoading, cardDataMap }: CardBreakdownTableProps) {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("avgPairPower");
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [modalCard, setModalCard] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const filtered = filter
      ? breakdown.filter((c) =>
          c.name.toLowerCase().includes(filter.toLowerCase()),
        )
      : breakdown;

    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string")
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [breakdown, filter, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: "Card Name" },
    { key: "avgPairPower", label: "Avg Power" },
    { key: "contribution", label: "Contribution" },
    { key: "pairsFound", label: "Found" },
    { key: "pairsMissing", label: "Missing" },
  ];

  return (
    <div className="glass rounded-xl p-4 overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        {viewMode === "table" && (
          <>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Filter cards..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <span className="text-xs text-text-muted">
              {sorted.length} card{sorted.length !== 1 ? "s" : ""}
            </span>
          </>
        )}
        <div className="ml-auto flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-border">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "table" ? "bg-accent text-white" : "text-text-muted hover:text-text"
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Table
          </button>
          <button
            onClick={() => setViewMode("columns")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "columns" ? "bg-accent text-white" : "text-text-muted hover:text-text"
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            Columns
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "list" ? "bg-accent text-white" : "text-text-muted hover:text-text"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
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
                <th className="py-2 text-left text-text-muted font-medium w-32">
                  Power Bar
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((card, i) => {
                const percentile =
                  sorted.length > 1
                    ? Math.round(((sorted.length - 1 - i) / (sorted.length - 1)) * 100)
                    : 100;

                return (
                  <tr
                    key={card.name}
                    onClick={() => onSelectCard?.(card.name)}
                    className={`border-b border-border/50 transition-colors ${
                      onSelectCard ? "cursor-pointer" : ""
                    } ${
                      selectedCard === card.name
                        ? "bg-accent/10 hover:bg-accent/15"
                        : "hover:bg-surface-light/50"
                    }`}
                  >
                    <td className="py-2 text-text-muted">{i + 1}</td>
                    <td className="py-2 font-medium">
                      <CardTooltip cardName={card.name}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setModalCard(card.name); }}
                          className="hover:text-accent transition-colors cursor-pointer text-left"
                        >
                          {card.name}
                        </button>
                      </CardTooltip>
                      {card.quantity && card.quantity > 1 && (
                        <span className="ml-1.5 text-xs text-text-muted font-normal">
                          x{card.quantity}
                        </span>
                      )}
                    </td>
                    <td className="py-2 font-mono">{card.avgPairPower.toFixed(4)}</td>
                    <td className="py-2 font-mono">{card.contribution.toFixed(2)}</td>
                    <td className="py-2">{card.pairsFound}</td>
                    <td className="py-2">{card.pairsMissing}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-bg rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all ${getQuartileColor(percentile)}`}
                            style={{ width: `${Math.max(percentile, 2)}%` }}
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
      ) : typesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
        </div>
      ) : groupedCards ? (
        viewMode === "columns" ? (
          <div style={{ columns: "4 180px", columnGap: "2rem" }}>
            {TYPE_CATEGORIES.filter((cat) => groupedCards[cat].length > 0).map((cat) => (
              <div key={cat} style={{ breakInside: "avoid" }} className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wide mb-2 text-text-muted border-b border-white/10 pb-1">
                  {cat} <span className="font-normal">({groupedCards[cat].length})</span>
                </h3>
                <ul className="space-y-0.5">
                  {groupedCards[cat].map((name) => (
                    <li key={name} className="flex items-baseline gap-2 text-sm">
                      <span className="text-text-muted text-xs w-3 shrink-0">1</span>
                      <button
                        onClick={() => setModalCard(name)}
                        className="text-text truncate hover:text-accent transition-colors cursor-pointer text-left"
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {TYPE_CATEGORIES.filter((cat) => groupedCards[cat].length > 0).map((cat) => (
              <div key={cat}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted mb-1 pb-1 border-b border-white/10">
                  {cat} ({groupedCards[cat].length})
                </h3>
                <ul>
                  {groupedCards[cat].map((name) => (
                    <li key={name} className="flex items-baseline gap-2 text-sm py-0.5">
                      <span className="text-text-muted text-xs w-3 shrink-0">1</span>
                      <button
                        onClick={() => setModalCard(name)}
                        className="text-text hover:text-accent transition-colors cursor-pointer text-left"
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : (
        <p className="text-sm text-text-muted text-center py-8">Card type data unavailable</p>
      )}

      {modalCard && (
        <CardModal
          cardName={modalCard}
          prefetchedData={cardDataMap?.get(modalCard)}
          breakdown={breakdown.find((c) => c.name === modalCard)}
          onClose={() => setModalCard(null)}
        />
      )}
    </div>
  );
}
