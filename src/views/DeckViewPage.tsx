import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Swords, ArrowLeft, Loader2, Share2, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { analyzeDeck } from "../lib/deckAnalyzer";
import ResultsDashboard from "../components/ResultsDashboard";
import { useCardTypes } from "../hooks/useCardTypes";
import type { PairData, DeckAnalysis } from "../types";
import type { Decklist } from "../hooks/useDecklists";

interface Snapshot {
  snapshot_date: string;
  power_rank: number;
}

function Sparkline({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) return null;
  const W = 100, H = 50, PAD = 4;
  const values = snapshots.map((s) => s.power_rank);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.01;
  const points = snapshots.map((s, i) => {
    const x = PAD + (i / (snapshots.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((s.power_rank - min) / range) * (H - PAD * 2);
    return [x, y] as [number, number];
  });
  const polylinePoints = points.map(([x, y]) => `${x},${y}`).join(" ");
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const color = last > prev + 0.001 ? "#22c55e" : last < prev - 0.001 ? "#ef4444" : "#6b7280";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" preserveAspectRatio="none">
      <polyline points={polylinePoints} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      ))}
    </svg>
  );
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
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  const { cardTypes, typesLoading, groupedCards } = useCardTypes(
    deck?.cards ?? [],
    deck?.commander ?? ""
  );

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
    if (!id) return;
    supabase
      .from("deck_snapshots")
      .select("snapshot_date, power_rank")
      .eq("deck_id", id)
      .order("snapshot_date", { ascending: true })
      .then(({ data }) => { if (data) setSnapshots(data); });
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
    <div className="relative">
      {deck.commander && (() => {
        const commanders = deck.commander.split(" / ").map((c) => c.trim()).filter(Boolean);
        return (
          <>
            <div className="absolute inset-x-0 top-0 w-full h-72 flex">
              {commanders.slice(0, 2).map((c, i) => (
                <img
                  key={i}
                  src={`/api/card-image?name=${encodeURIComponent(c)}&version=art_crop`}
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
        {analysis && (
          <ResultsDashboard
            results={analysis}
            groupedCards={groupedCards}
            typesLoading={typesLoading}
            cardDataMap={cardTypes}
          />
        )}

        {snapshots.length >= 2 && (() => {
          const first = snapshots[0];
          const last = snapshots[snapshots.length - 1];
          const delta = last.power_rank - first.power_rank;
          const sign = delta > 0 ? "+" : "";
          const trendColor = delta > 0.001 ? "text-green-400" : delta < -0.001 ? "text-red-400" : "text-text-muted";
          return (
            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Power Rank History</h2>
                <span className={`text-sm font-mono font-semibold ${trendColor}`}>
                  {sign}{delta.toFixed(2)} all time
                </span>
              </div>
              <Sparkline snapshots={snapshots} />
              <div className="flex justify-between mt-2 text-xs text-text-muted">
                <span>{first.snapshot_date}</span>
                <span>{last.snapshot_date}</span>
              </div>
            </div>
          );
        })()}

      </main>
    </div>
  );
}
