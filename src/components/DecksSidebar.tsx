import { useState } from "react";
import { History, Trash2, Loader2, Swords, ClipboardCopy, Share2, Check } from "lucide-react";
import type { HistoryEntry } from "../types";
import type { Decklist } from "../hooks/useDecklists";
import ExportDeckModal from "./ExportDeckModal";

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
  const [exportDeck, setExportDeck] = useState<Decklist | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleShare(deckId: string) {
    const url = `${window.location.origin}/decks/${deckId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(deckId);
      setTimeout(() => setCopiedId((id) => (id === deckId ? null : id)), 1500);
    });
  }

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
                    <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShare(deck.id); }}
                        className={`transition-colors cursor-pointer ${
                          copiedId === deck.id ? "text-accent" : "text-text-muted hover:text-accent"
                        }`}
                        title={copiedId === deck.id ? "Link copied!" : "Copy deck link"}
                      >
                        {copiedId === deck.id ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setExportDeck(deck); }}
                        className="text-text-muted hover:text-accent transition-colors cursor-pointer"
                        title="Export decklist"
                      >
                        <ClipboardCopy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmId(deck.id); }}
                        className="text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete deck"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {deck.deck_name ? (
                <p className="text-xs font-medium text-text truncate">
                  {deck.deck_name}
                </p>
              ) : deck.commander ? (
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

      {exportDeck && (
        <ExportDeckModal
          deckName={exportDeck.deck_name || exportDeck.commander || "Unnamed Deck"}
          cards={exportDeck.cards}
          onClose={() => setExportDeck(null)}
        />
      )}
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
