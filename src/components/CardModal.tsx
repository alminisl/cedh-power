import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import type { CardBreakdownItem, ScryfallCardData } from "../types";
import ManaSymbols from "./ManaSymbols";

interface CardModalProps {
  cardName: string;
  breakdown?: CardBreakdownItem;
  onClose: () => void;
  prefetchedData?: ScryfallCardData;
}

export default function CardModal({ cardName, breakdown, onClose, prefetchedData }: CardModalProps) {
  const [card, setCard] = useState<ScryfallCardData | null>(prefetchedData ?? null);
  const [loading, setLoading] = useState(!prefetchedData);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (prefetchedData) return;
    setLoading(true);
    setError(false);
    setCard(null);
    fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: [{ name: cardName }] }),
    })
      .then((r) => r.json())
      .then((data) => {
        const card = data.data?.[0] ?? null;
        if (!card) setError(true);
        else setCard(card);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [cardName, prefetchedData]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const imageUri = card?.image_uris?.normal ?? card?.card_faces?.[0]?.image_uris?.normal;
  const oracleText = card?.oracle_text
    ?? card?.card_faces?.map((f) => f.oracle_text).filter(Boolean).join("\n—\n");

  function renderWithSymbols(text: string) {
    return text.split("\n").map((line, li) => (
      <span key={li} className="block">
        {line.split(/(\{[^}]+\})/g).map((part, pi) => {
          const match = part.match(/^\{([^}]+)\}$/);
          if (match) {
            const s = match[1].toLowerCase();
            const cls = s === "t" ? "ms-tap" : s === "q" ? "ms-untap" : `ms-${s.replace("/", "")}`;
            return <i key={pi} className={`ms ms-cost ms-shadow ${cls}`} title={part} />;
          }
          return part;
        })}
      </span>
    ));
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-white/10 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : error || !card ? (
          <div className="p-8 text-center text-text-muted text-sm">
            Could not load card data.
          </div>
        ) : (
          <div className="flex gap-6 p-6">
            {imageUri && (
              <div className="shrink-0">
                <img
                  src={imageUri}
                  alt={card.name}
                  className="w-48 rounded-xl shadow-lg"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold mb-0.5">{card.name}</h2>
              {card.mana_cost && (
                <div className="mb-2">
                  <ManaSymbols cost={card.mana_cost} className="text-xl" />
                </div>
              )}
              <p className="text-sm text-text-muted italic mb-3">{card.type_line}</p>

              {oracleText && (
                <div className="text-sm text-text leading-relaxed mb-3 space-y-1">
                  {renderWithSymbols(oracleText)}
                </div>
              )}

              {(card.power != null || card.toughness != null) && (
                <p className="text-sm font-mono text-right mb-2">
                  {card.power} / {card.toughness}
                </p>
              )}
              {card.loyalty != null && (
                <p className="text-sm font-mono text-right mb-2">
                  Loyalty: {card.loyalty}
                </p>
              )}

              <div className="text-xs text-text-muted mb-1">
                {card.set_name} ({card.set.toUpperCase()}) · #{card.collector_number} · {card.rarity}
              </div>
              {(card.prices.usd || card.prices.usd_foil) && (
                <p className="text-xs text-text-muted mb-4">
                  ${card.prices.usd ?? "—"} · ${card.prices.usd_foil ?? "—"} foil
                </p>
              )}

              {breakdown && (
                <div className="border-t border-border pt-4 mt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted mb-3">
                    Deck Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="glass rounded-lg p-3">
                      <div className="text-xs text-text-muted mb-0.5">Avg Pair Power</div>
                      <div className="text-sm font-mono font-semibold">
                        {breakdown.avgPairPower.toFixed(4)}
                      </div>
                    </div>
                    <div className="glass rounded-lg p-3">
                      <div className="text-xs text-text-muted mb-0.5">Contribution</div>
                      <div className="text-sm font-mono font-semibold">
                        {breakdown.contribution.toFixed(2)}
                      </div>
                    </div>
                    <div className="glass rounded-lg p-3">
                      <div className="text-xs text-text-muted mb-0.5">Pairs Found</div>
                      <div className="text-sm font-mono font-semibold">{breakdown.pairsFound}</div>
                    </div>
                    <div className="glass rounded-lg p-3">
                      <div className="text-xs text-text-muted mb-0.5">Pairs Missing</div>
                      <div className="text-sm font-mono font-semibold">{breakdown.pairsMissing}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
