import { useState } from "react";
import { Link } from "react-router-dom";
import { Swords, Trash2, Loader2, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useDecklists } from "../hooks/useDecklists";

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
      <div className="flex items-center gap-3">
        <Swords className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-bold">My Decks</h1>
        <span className="text-sm text-text-muted">
          {decklists.length} deck{decklists.length !== 1 ? "s" : ""}
        </span>
      </div>

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
          {decklists.map((deck) => (
            <Link
              key={deck.id}
              to={`/decks/${deck.id}`}
              className="glass rounded-xl p-5 hover:bg-surface-light/50 transition-colors border border-border/50 hover:border-accent/30 group block"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold truncate pr-2">
                  {deck.commander || "Unnamed Deck"}
                </h3>
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
                <div>
                  <span className="text-text-muted">Avg Power</span>
                  <p className="font-mono font-semibold text-accent">
                    {deck.average_pair_power.toFixed(4)}
                  </p>
                </div>
                <div>
                  <span className="text-text-muted">Cards</span>
                  <p className="font-mono font-semibold">{deck.cards.length}</p>
                </div>
                <div>
                  <span className="text-text-muted">Pairs Found</span>
                  <p className="font-mono">{deck.pairs_found.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-text-muted">Missing</span>
                  <p className="font-mono">{deck.pairs_missing.toLocaleString()}</p>
                </div>
              </div>

              <p className="text-xs text-text-muted/60">
                {formatTime(deck.updated_at)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
