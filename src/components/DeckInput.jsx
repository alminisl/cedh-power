import { useState } from "react";
import { ClipboardPaste, Sparkles, Users, AlertTriangle } from "lucide-react";
import { parseDeckList } from "../lib/deckAnalyzer";

export default function DeckInput({ onAnalyze, disabled, text, onTextChange }) {
  const [partners, setPartners] = useState(false);

  const cards = parseDeckList(text);
  const cardCount = cards.length;

  const commanderNames =
    cardCount > 0
      ? partners
        ? cards.slice(0, 2)
        : cards.slice(0, 1)
      : [];

  const commanderLabel = commanderNames.join(" / ");

  function handleAnalyze() {
    if (cardCount === 0) return;
    onAnalyze(cards, commanderLabel);
  }

  return (
    <div className="glass rounded-xl p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardPaste className="w-5 h-5 text-accent" />
        <h2 className="text-base font-semibold">Paste Your Deck List</h2>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-amber-400 mb-3">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        Commander(s) must be the first card(s) in your list
      </p>

      <textarea
        className="w-full h-64 bg-bg border border-border rounded-lg p-4 text-sm font-mono text-text placeholder-text-muted resize-none focus:outline-none focus:border-accent transition-colors"
        placeholder={`1 Sol Ring\n1 Mana Crypt\n1 Rhystic Study\n...`}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
      />

      {/* Commander detection */}
      <div className="flex items-center gap-3 mt-3 mb-2">
        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={partners}
            onChange={(e) => setPartners(e.target.checked)}
            className="accent-accent"
          />
          <Users className="w-4 h-4" />
          Partner commanders (first 2 cards)
        </label>
      </div>

      {commanderLabel && (
        <p className="text-xs text-accent mb-2">
          Commander{commanderNames.length > 1 ? "s" : ""}: {commanderLabel}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">
            {cardCount} card{cardCount !== 1 ? "s" : ""} detected
          </span>
          {cardCount > 0 && cardCount !== 100 && (
            <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
              Expected 100 cards
            </span>
          )}
        </div>

        <button
          onClick={handleAnalyze}
          disabled={cardCount === 0 || disabled}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Analyze Deck
        </button>
      </div>
    </div>
  );
}
