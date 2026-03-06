import { useState } from "react";
import { History, Trash2, Loader2, Swords } from "lucide-react";
import type { HistoryEntry } from "../types";
import type { Decklist } from "../hooks/useDecklists";

function formatTime(ts: string | number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  }) + " " + d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DecksSidebarProps =
  | {
      // Logged in: show saved decklists
      decklists: Decklist[];
      loading: boolean;
      onSelect: (deck: Decklist) => void;
      onDelete: (id: string) => void;
      history?: never;
      onClearHistory?: never;
      onSelectHistory?: never;
    }
  | {
      // Logged out: show localStorage history
      history: HistoryEntry[];
      onClearHistory: () => void;
      onSelectHistory: (entry: HistoryEntry) => void;
      decklists?: never;
      loading?: never;
      onSelect?: never;
      onDelete?: never;
    };

export default function DecksSidebar(props: DecksSidebarProps) {
  if (props.decklists !== undefined) {
    return <SavedDecks {...props} />;
  }
  return <HistorySidebarFallback {...props} />;
}

function SavedDecks({
  decklists,
  loading,
  onSelect,
  onDelete,
}: {
  decklists: Decklist[];
  loading: boolean;
  onSelect: (deck: Decklist) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (loading) {
    return (
      <aside className="w-80 shrink-0">
        <div className="glass rounded-xl p-4 sticky top-16 flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
        </div>
      </aside>
    );
  }

  if (decklists.length === 0) {
    return (
      <aside className="w-80 shrink-0">
        <div className="glass rounded-xl p-4 sticky top-16">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Swords className="w-4 h-4 text-accent" />
            My Decks
          </h2>
          <p className="text-xs text-text-muted text-center py-4">
            Analyze a deck to save it here.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 shrink-0">
      <div className="glass rounded-xl p-4 sticky top-16">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <Swords className="w-4 h-4 text-accent" />
          My Decks ({decklists.length})
        </h2>

        <ul className="space-y-2 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
          {decklists.map((deck) => (
            <li
              key={deck.id}
              className="p-3 rounded-lg bg-bg/50 hover:bg-surface-light/50 transition-colors cursor-pointer border border-border/50 group"
              onClick={() => onSelect(deck)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-semibold text-accent">
                  {deck.average_pair_power.toFixed(4)}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-muted">
                    {deck.cards.length} cards
                  </span>
                  {confirmId === deck.id ? (
                    <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { onDelete(deck.id); setConfirmId(null); }}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-xs text-text-muted hover:text-text cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmId(deck.id); }}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              {deck.commander ? (
                <p className="text-xs font-medium text-text truncate">
                  {deck.commander}
                </p>
              ) : (
                <p className="text-xs text-text-muted truncate">
                  {deck.cards.slice(0, 3).join(", ")}
                </p>
              )}
              <p className="text-xs text-text-muted/60 mt-1">
                {formatTime(deck.updated_at)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function HistorySidebarFallback({
  history,
  onClearHistory,
  onSelectHistory,
}: {
  history: HistoryEntry[];
  onClearHistory: () => void;
  onSelectHistory: (entry: HistoryEntry) => void;
}) {
  if (history.length === 0) return null;

  return (
    <aside className="w-80 shrink-0">
      <div className="glass rounded-xl p-4 sticky top-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            History
          </h2>
          <button
            onClick={onClearHistory}
            className="text-xs text-text-muted hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>

        <ul className="space-y-2 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
          {history.map((entry) => (
            <li
              key={entry.id}
              onClick={() => onSelectHistory(entry)}
              className="p-3 rounded-lg bg-bg/50 hover:bg-surface-light/50 transition-colors cursor-pointer border border-border/50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-semibold text-accent">
                  {entry.averagePairPower.toFixed(4)}
                </span>
                <span className="text-xs text-text-muted">
                  {entry.cardCount} cards
                </span>
              </div>
              {entry.commander ? (
                <p className="text-xs font-medium text-text truncate">
                  {entry.commander}
                </p>
              ) : (
                <p className="text-xs text-text-muted truncate">
                  {entry.firstCards.join(", ")}
                </p>
              )}
              <p className="text-xs text-text-muted/60 mt-1">
                {formatTime(entry.timestamp)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
