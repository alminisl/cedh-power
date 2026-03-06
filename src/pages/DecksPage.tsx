import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Swords, Trash2, Loader2, LogIn, ArrowUpDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useDecklists } from "../hooks/useDecklists";
import type { Decklist } from "../hooks/useDecklists";

type SortKey = "power_rank" | "commander";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "power_rank", label: "Power Rank" },
  { key: "commander", label: "Name" },
];

const COLOR_ORDER = ["W", "U", "B", "R", "G"];
const COLOR_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  W: { bg: "bg-amber-100", text: "text-amber-900", label: "W" },
  U: { bg: "bg-blue-500", text: "text-white", label: "U" },
  B: { bg: "bg-gray-800", text: "text-gray-200", label: "B" },
  R: { bg: "bg-red-500", text: "text-white", label: "R" },
  G: { bg: "bg-green-600", text: "text-white", label: "G" },
};

function ColorFilterButton({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  const style = COLOR_STYLES[color];
  if (!style) return null;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all cursor-pointer ${
        active
          ? `${style.bg} ${style.text} ring-2 ring-accent`
          : `${style.bg} ${style.text} opacity-30 hover:opacity-60`
      }`}
    >
      {style.label}
    </button>
  );
}

function ColorPips({ colors }: { colors: string[] }) {
  if (!colors || colors.length === 0) {
    return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-600 text-gray-300 text-[10px] font-bold">C</span>;
  }
  const sorted = [...colors].sort((a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b));
  return (
    <span className="inline-flex gap-0.5">
      {sorted.map((c) => {
        const style = COLOR_STYLES[c];
        if (!style) return null;
        return (
          <span
            key={c}
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${style.bg} ${style.text} text-[10px] font-bold`}
          >
            {style.label}
          </span>
        );
      })}
    </span>
  );
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " " + d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DecksPage() {
  const { user, signInWithDiscord } = useAuth();
  const { decklists, loading, deleteDeck } = useDecklists(user?.id);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("power_rank");
  const [sortAsc, setSortAsc] = useState(false);
  const [colorFilter, setColorFilter] = useState<Set<string>>(new Set());

  function toggleColor(c: string) {
    setColorFilter((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  const sorted = useMemo(() => {
    let filtered = decklists;
    if (colorFilter.size > 0) {
      filtered = decklists.filter((d) => {
        const ci = d.color_identity ?? [];
        return [...colorFilter].every((c) => ci.includes(c));
      });
    }
    return [...filtered].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sortKey === "commander") {
        av = (a.commander ?? "").toLowerCase();
        bv = (b.commander ?? "").toLowerCase();
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      if (typeof av === "string" && typeof bv === "string")
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [decklists, sortKey, sortAsc, colorFilter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === "commander");
    }
  }

  if (!user) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Swords className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">My Decks</h1>
        <p className="text-text-muted mb-6">Sign in with Discord to save and view your decklists.</p>
        <button
          onClick={signInWithDiscord}
          className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          Sign in with Discord
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Swords className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-bold">My Decks</h1>
        <span className="text-sm text-text-muted">
          {sorted.length}{colorFilter.size > 0 ? ` / ${decklists.length}` : ""} deck{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {decklists.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
            {SORT_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  sortKey === key
                    ? "bg-accent/15 text-accent"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {label}
                {sortKey === key && (
                  <span className="ml-0.5">{sortAsc ? "↑" : "↓"}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {COLOR_ORDER.map((c) => (
              <ColorFilterButton
                key={c}
                color={c}
                active={colorFilter.has(c)}
                onClick={() => toggleColor(c)}
              />
            ))}
            {colorFilter.size > 0 && (
              <button
                onClick={() => setColorFilter(new Set())}
                className="text-xs text-text-muted hover:text-text ml-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : decklists.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-text-muted">
            No saved decks yet. Analyze a deck and click "Save Deck" to add one here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((deck) => (
            <Link
              key={deck.id}
              to={`/decks/${deck.id}`}
              className="relative rounded-xl overflow-hidden border border-border/50 hover:border-accent/30 group block transition-colors"
            >
              {deck.commander && (
                <img
                  src={`https://api.scryfall.com/cards/named?format=image&exact=${encodeURIComponent(deck.commander)}&version=art_crop`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-15 group-hover:opacity-25 transition-opacity"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <ColorPips colors={deck.color_identity ?? []} />
                    <h3 className="font-semibold truncate">
                      {deck.commander || "Unnamed Deck"}
                    </h3>
                  </div>
                  {confirmDeleteId === deck.id ? (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.preventDefault()}>
                      <button
                        onClick={() => { deleteDeck(deck.id); setConfirmDeleteId(null); }}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-text-muted hover:text-text cursor-pointer ml-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.preventDefault(); setConfirmDeleteId(deck.id); }}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div title="Overall power score based on how strong your card pairs are together">
                    <span className="text-text-muted">Power Rank</span>
                    <p className="font-mono font-semibold text-accent">
                      {deck.power_rank.toFixed(2)}
                    </p>
                  </div>
                  <div title="Total number of cards in this decklist">
                    <span className="text-text-muted">Cards</span>
                    <p className="font-mono font-semibold">{deck.cards.length}</p>
                  </div>
                  <div title="Number of card pairs in this deck that have known synergy data">
                    <span className="text-text-muted">Pairs Found</span>
                    <p className="font-mono">{deck.pairs_found.toLocaleString()}</p>
                  </div>
                  <div title="Number of card pairs with no synergy data — these couldn't be scored">
                    <span className="text-text-muted">Missing</span>
                    <p className="font-mono">{deck.pairs_missing.toLocaleString()}</p>
                  </div>
                </div>

                <p className="text-xs text-text-muted/60">
                  {formatTime(deck.updated_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
