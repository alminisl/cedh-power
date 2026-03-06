import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Swords, ArrowLeft, Loader2, Share2, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { analyzeDeck } from "../lib/deckAnalyzer";
import ResultsDashboard from "../components/ResultsDashboard";
import type { PairData, DeckAnalysis } from "../types";
import type { Decklist } from "../hooks/useDecklists";

interface DeckViewPageProps {
  pairData: PairData | null;
}

export default function DeckViewPage({ pairData }: DeckViewPageProps) {
  const { id } = useParams<{ id: string }>();
  const [deck, setDeck] = useState<Decklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
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
          {deck.commander || "Unnamed Deck"}
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
    </main>
  );
}
