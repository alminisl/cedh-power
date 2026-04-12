import { useState, useMemo } from "react";
import { Search, ArrowUpDown, LayoutList, List, Grid2X2, Loader2 } from "lucide-react";
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

function getCardImageUrl(cardName: string, cardData?: ScryfallCardData): string {
  if (cardData?.image_uris?.normal) return cardData.image_uris.normal;
  if (cardData?.card_faces?.[0]?.image_uris?.normal) return cardData.card_faces[0].image_uris.normal;
  return `https://api.scryfall.com/cards/named?format=image&exact=${encodeURIComponent(cardName)}&version=normal`;
}

type SortKey = keyof CardBreakdownItem;
type ViewMode = "table" | "list" | "cards";

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
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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

  const tableColumns: { key: SortKey; label: string }[] = [
    { key: "name", label: "Card Name" },
    { key: "avgPairPower", label: "Avg Power" },
    { key: "contribution", label: "Contribution" },
    { key: "pairsFound", label: "Found" },
    { key: "pairsMissing", label: "Missing" },
  ];

  // Build filtered type groups
  const activeGroups = useMemo(() => {
    if (!groupedCards) return [];
    return TYPE_CATEGORIES
      .filter((cat) => (groupedCards[cat]?.length ?? 0) > 0)
      .map((cat) => ({ key: cat, label: cat, cards: groupedCards[cat] }));
  }, [groupedCards]);

  // Distribute groups into 3 balanced columns (Moxfield style)
  const [col1, col2, col3] = useMemo(() => {
    if (activeGroups.length === 0) return [[], [], []];
    const first = [activeGroups[0]];
    const rest = activeGroups.slice(1);
    const c2: typeof activeGroups = [];
    const c3: typeof activeGroups = [];
    let s2 = 0, s3 = 0;
    const total = rest.reduce((s, g) => s + g.cards.length, 0);
    for (const g of rest) {
      if (s2 <= s3 && s2 < total / 2) { c2.push(g); s2 += g.cards.length; }
      else { c3.push(g); s3 += g.cards.length; }
    }
    return [first, c2, c3];
  }, [activeGroups]);

  // The card shown in the list view left panel
  const previewCardName = hoveredCard ?? activeGroups[0]?.cards[0] ?? null;
  const previewCardData = previewCardName ? cardDataMap?.get(previewCardName) : undefined;

  function renderListSection(key: string, label: string, cards: string[]) {
    return (
      <div key={key}>
        <div className="mb-1.5 pb-1 border-b border-white/10">
          <span className="text-sm font-bold text-text">{label}</span>
          <span className="ml-1.5 text-sm font-normal text-text-muted">({cards.length})</span>
        </div>
        <div>
          {cards.map((name) => (
            <div
              key={name}
              data-card-row
              className="flex items-baseline gap-2 py-0.5 group cursor-pointer"
              onMouseEnter={() => setHoveredCard(name)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => setModalCard(name)}
            >
              <span className="text-text-muted text-xs w-3 shrink-0">1</span>
              <span className="text-sm text-text group-hover:text-accent transition-colors truncate">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderListColumn(groups: typeof activeGroups) {
    return (
      <div className="flex-1 min-w-[160px] flex flex-col gap-5">
        {groups.map((g) => renderListSection(g.key, g.label, g.cards))}
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4">
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
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "list" ? "bg-accent text-white" : "text-text-muted hover:text-text"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "cards" ? "bg-accent text-white" : "text-text-muted hover:text-text"
            }`}
          >
            <Grid2X2 className="w-3.5 h-3.5" />
            Cards
          </button>
        </div>
      </div>

      {/* ── Table view ── */}
      {viewMode === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-8 py-2 text-left text-text-muted font-medium">#</th>
                {tableColumns.map((col) => (
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

        /* ── List view (Moxfield style) ── */
        viewMode === "list" ? (
          <>
            {/* Mobile: single column */}
            <div className="flex flex-col gap-5 md:hidden">
              {activeGroups.map((g) => renderListSection(g.key, g.label, g.cards))}
            </div>

            {/* Desktop: sticky left image panel + 3 balanced columns */}
            <div className="hidden md:flex gap-6 items-start">
              {/* Left panel — sticky so it stays visible while scrolling the list */}
              <div className="flex-shrink-0 w-52 sticky top-20 flex flex-col gap-3">
                {previewCardName && (
                  <>
                    <div
                      className="rounded-lg overflow-hidden shadow-lg cursor-pointer hover:shadow-accent/20 hover:shadow-xl transition-all duration-150"
                      onClick={() => previewCardName && setModalCard(previewCardName)}
                    >
                      <img
                        src={getCardImageUrl(previewCardName, previewCardData)}
                        alt={previewCardName}
                        className="w-full h-auto block"
                        loading="eager"
                      />
                    </div>

                    {previewCardData?.type_line && (
                      <p className="text-xs font-medium text-text-muted px-1">
                        {previewCardData.type_line}
                      </p>
                    )}

                    {previewCardData?.oracle_text && (
                      <p className="text-xs leading-relaxed text-text px-1 whitespace-pre-wrap line-clamp-6">
                        {previewCardData.oracle_text}
                      </p>
                    )}

                    {(previewCardData?.prices?.usd || previewCardData?.prices?.usd_foil) && (
                      <div className="flex items-center gap-2 px-1 text-xs font-medium text-text-muted">
                        {previewCardData.prices.usd && (
                          <span className="text-text">${previewCardData.prices.usd}</span>
                        )}
                        {previewCardData.prices.usd && previewCardData.prices.usd_foil && (
                          <span>/</span>
                        )}
                        {previewCardData.prices.usd_foil && (
                          <span className="text-accent">
                            ${previewCardData.prices.usd_foil} <span className="opacity-60">foil</span>
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 3 balanced columns */}
              <div className="flex-1 flex gap-6" style={{ alignItems: "flex-start" }}>
                {col1.length > 0 && renderListColumn(col1)}
                {col2.length > 0 && renderListColumn(col2)}
                {col3.length > 0 && renderListColumn(col3)}
              </div>
            </div>
          </>
        ) : (

          /* ── Cards view (image grid) ── */
          <div className="space-y-6">
            {activeGroups.map((group) => (
              <div key={group.key}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted mb-2 pb-1 border-b border-white/10">
                  {group.label} <span className="font-normal">({group.cards.length})</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {group.cards.map((name) => {
                    const data = cardDataMap?.get(name);
                    const imgUrl = getCardImageUrl(name, data);
                    return (
                      <div
                        key={name}
                        className="relative group cursor-pointer transition-all duration-200 hover:scale-105 hover:-translate-y-1"
                        onClick={() => setModalCard(name)}
                      >
                        <div className="relative aspect-[745/1040] rounded-lg overflow-hidden shadow-md group-hover:shadow-xl group-hover:shadow-accent/10 transition-shadow duration-200">
                          <img
                            src={imgUrl}
                            alt={name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                        </div>
                      </div>
                    );
                  })}
                </div>
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
