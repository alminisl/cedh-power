import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Swords, ArrowLeft, Loader2, Share2, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { analyzeDeck } from "../lib/deckAnalyzer";
import ResultsDashboard from "../components/ResultsDashboard";
import type { PairData, DeckAnalysis } from "../types";
import type { Decklist } from "../hooks/useDecklists";

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

type CardTypeInfo = { name: string; type_line: string; mana_cost?: string };

function categorizeCard(typeLine: string, isCommander: boolean): string {
  if (isCommander) return "Commander";
  const t = typeLine.toLowerCase();
  if (t.includes("creature")) return "Creature";
  if (t.includes("instant")) return "Instant";
  if (t.includes("sorcery")) return "Sorcery";
  if (t.includes("artifact")) return "Artifact";
  if (t.includes("enchantment")) return "Enchantment";
  if (t.includes("planeswalker")) return "Planeswalker";
  if (t.includes("battle")) return "Battle";
  if (t.includes("land")) return "Land";
  return "Other";
}

async function fetchCardTypes(cardNames: string[]): Promise<Map<string, CardTypeInfo>> {
  const result = new Map<string, CardTypeInfo>();
  // Scryfall collection endpoint accepts max 75 cards per request
  for (let i = 0; i < cardNames.length; i += 75) {
    const batch = cardNames.slice(i, i + 75);
    const identifiers = batch.map((name) => ({ name }));
    try {
      const res = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers }),
      });
      if (res.ok) {
        const data = await res.json();
        for (const card of data.data ?? []) {
          result.set(card.name, {
            name: card.name,
            type_line: card.type_line ?? "",
            mana_cost: card.mana_cost ?? "",
          });
        }
      }
    } catch {
      // ignore fetch errors
    }
  }
  return result;
}

interface DeckViewPageProps {
  pairData: PairData | null;
}

export default function DeckViewPage({ pairData }: DeckViewPageProps) {
  const { id } = useParams<{ id: string }>();
  const [deck, setDeck] = useState<Decklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cardTypes, setCardTypes] = useState<Map<string, CardTypeInfo>>(new Map());
  const [typesLoading, setTypesLoading] = useState(false);

  const loadCardTypes = useCallback(async (cards: string[]) => {
    setTypesLoading(true);
    const types = await fetchCardTypes(cards);
    setCardTypes(types);
    setTypesLoading(false);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("decklists")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError("Deck not found");
        else setDeck(data);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (deck?.cards.length) loadCardTypes(deck.cards);
  }, [deck, loadCardTypes]);

  const groupedCards = useMemo(() => {
    if (!deck || cardTypes.size === 0) return null;
    const groups: Record<string, string[]> = {};
    for (const cat of TYPE_CATEGORIES) groups[cat] = [];

    for (const cardName of deck.cards) {
      const info = cardTypes.get(cardName);
      const isCommander = deck.commander === cardName;
      const category = info ? categorizeCard(info.type_line, isCommander) : isCommander ? "Commander" : "Other";
      groups[category].push(cardName);
    }

    // Sort cards within each category alphabetically
    for (const cat of TYPE_CATEGORIES) groups[cat].sort();

    return groups;
  }, [deck, cardTypes]);

  const analysis: DeckAnalysis | null = useMemo(() => {
    if (!deck || !pairData) return null;
    return analyzeDeck(deck.cards, pairData);
  }, [deck, pairData]);

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </main>
    );
  }

  if (error || !deck) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-red-400 font-semibold mb-4">Deck not found</p>
        <Link to="/decks" className="text-sm text-accent hover:underline">
          Back to decks
        </Link>
      </main>
    );
  }

  return (
    <div className="relative">
      {deck.commander && (() => {
        const commanders = deck.commander.split(" / ").map((c) => c.trim()).filter(Boolean);
        return (
          <>
            <div className="absolute inset-x-0 top-0 w-full h-72 flex">
              {commanders.slice(0, 2).map((c, i) => (
                <img
                  key={i}
                  src={`https://api.scryfall.com/cards/named?format=image&exact=${encodeURIComponent(c)}&version=art_crop`}
                  alt=""
                  className="h-full object-cover opacity-15"
                  style={{ width: `${100 / commanders.length}%` }}
                />
              ))}
            </div>
            <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-transparent via-bg/70 to-bg" />
          </>
        );
      })()}
      <main className="relative max-w-7xl mx-auto px-4 py-8 space-y-6">
        <Link
          to="/decks"
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to decks
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <Swords className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold">
            {deck.deck_name || deck.commander || "Unnamed Deck"}
          </h1>
          <span className="text-sm text-text-muted">
            {deck.cards.length} cards
          </span>
          <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              copied
                ? "bg-green-500/20 text-green-400 border border-green-500/40"
                : "glass text-text-muted hover:text-text border border-border"
            }`}
          >
            {copied ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Link copied
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                Share
              </>
            )}
          </button>
        </div>
        {analysis && <ResultsDashboard results={analysis} />}

        {/* Card List by Type */}
        {typesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-accent animate-spin" />
          </div>
        ) : groupedCards && (
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Decklist</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {TYPE_CATEGORIES.filter((cat) => groupedCards[cat].length > 0).map((cat) => (
                <div key={cat}>
                  <h3 className="text-sm font-semibold text-accent mb-2">
                    {cat} ({groupedCards[cat].length})
                  </h3>
                  <ul className="space-y-0.5">
                    {groupedCards[cat].map((name) => (
                      <li key={name} className="text-sm text-text truncate">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
