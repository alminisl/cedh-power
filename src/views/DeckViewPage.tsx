import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Swords, ArrowLeft, Loader2, Share2, CheckCircle, ClipboardCopy } from "lucide-react";
import ExportDeckModal from "../components/ExportDeckModal";
import { analyzeDeck } from "../lib/deckAnalyzer";
import ResultsDashboard from "../components/ResultsDashboard";
import { useCardTypes } from "../hooks/useCardTypes";
import type { PairData, DeckAnalysis } from "../types";
import type { Decklist } from "../hooks/useDecklists";

interface Snapshot {
  snapshot_date: string;
  power_rank: number;
}

const fmtDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}-${m}-${y}`; };

function PowerRankChart({ snapshots }: { snapshots: Snapshot[] }) {
  const [tooltip, setTooltip] = useState<{ idx: number; left: number; top: number } | null>(null);

  if (snapshots.length < 2) return null;

  const W = 560, H = 100;
  const cH = H - 6;

  const values = snapshots.map((s) => s.power_rank);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawRange = rawMax - rawMin || 1;
  const yMin = rawMin - rawRange * 0.18;
  const yMax = rawMax + rawRange * 0.18;
  const yRange = yMax - yMin;

  const toX = (i: number) => (i / (snapshots.length - 1)) * W;
  const toY = (v: number) => 6 + cH - ((v - yMin) / yRange) * cH;

  const pts = snapshots.map((s, i) => [toX(i), toY(s.power_rank)] as [number, number]);

  const linePath = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const mx = (px + x) / 2;
    return `${acc} C${mx},${py} ${mx},${y} ${x},${y}`;
  }, "");

  const areaPath = `${linePath} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;

  const delta = values[values.length - 1] - values[0];
  const color = delta > 0.001 ? "#22c55e" : delta < -0.001 ? "#ef4444" : "#6b7280";

  const peakIdx = values.indexOf(rawMax);
  const peakDate = snapshots[peakIdx].snapshot_date;
  const mid = Math.floor((snapshots.length - 1) / 2);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const idx = Math.max(0, Math.min(snapshots.length - 1, Math.round(xFrac * (snapshots.length - 1))));
    const left = (pts[idx][0] / W) * rect.width;
    const top = (pts[idx][1] / H) * rect.height;
    setTooltip({ idx, left, top });
  };

  const tipAnchor = tooltip
    ? tooltip.idx < snapshots.length * 0.25
      ? "translateY(calc(-100% - 8px))"
      : tooltip.idx > snapshots.length * 0.75
      ? "translate(-100%, calc(-100% - 8px))"
      : "translate(-50%, calc(-100% - 8px))"
    : "";

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
          <defs>
            <linearGradient id="prAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.2, 0.5, 0.8].map((f, i) => (
            <line key={i} x1={0} y1={toY(yMin + yRange * f)} x2={W} y2={toY(yMin + yRange * f)} stroke="#ffffff0d" strokeWidth="1" />
          ))}
          <path d={areaPath} fill="url(#prAreaGrad)" />
          <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="5" fill={color} fillOpacity="0.2" />
          <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
        </svg>

        {/* mouse tracking overlay */}
        <div
          className="absolute inset-0 cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        />

        {tooltip && (
          <>
            <div className="absolute top-0 bottom-0 w-px bg-white/10 pointer-events-none" style={{ left: tooltip.left }} />
            <div
              className="absolute w-3 h-3 rounded-full pointer-events-none border-2 border-black/30"
              style={{ left: tooltip.left, top: tooltip.top, transform: "translate(-50%, -50%)", backgroundColor: color }}
            />
            <div
              className="absolute pointer-events-none z-10 glass border border-border rounded-lg px-2.5 py-1.5 shadow-lg"
              style={{ left: tooltip.left, top: tooltip.top, transform: tipAnchor }}
            >
              <div className="text-xs font-mono font-semibold" style={{ color }}>
                {snapshots[tooltip.idx].power_rank.toFixed(1)}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">{fmtDate(snapshots[tooltip.idx].snapshot_date)}</div>
            </div>
          </>
        )}
      </div>

      {/* date axis */}
      <div className="flex justify-between px-4 pt-1 pb-3 text-[10px] text-text-muted">
        <span>{fmtDate(snapshots[0].snapshot_date)}</span>
        <span>{fmtDate(snapshots[mid].snapshot_date)}</span>
        <span>{fmtDate(snapshots[snapshots.length - 1].snapshot_date)}</span>
      </div>

      {/* stats row */}
      <div className="grid grid-cols-3 border-t border-border">
        <div className="px-4 py-3">
          <div className="text-[10px] text-text-muted mb-0.5">Start</div>
          <div className="text-sm font-mono font-semibold">{values[0].toFixed(1)}</div>
          <div className="text-[10px] text-text-muted">{fmtDate(snapshots[0].snapshot_date)}</div>
        </div>
        <div className="px-4 py-3 border-x border-border">
          <div className="text-[10px] text-text-muted mb-0.5">Peak</div>
          <div className="text-sm font-mono font-semibold text-yellow-400">{rawMax.toFixed(1)}</div>
          <div className="text-[10px] text-text-muted">{fmtDate(peakDate)}</div>
        </div>
        <div className="px-4 py-3 text-right">
          <div className="text-[10px] text-text-muted mb-0.5">Current</div>
          <div className={`text-sm font-mono font-semibold ${delta > 0.001 ? "text-green-400" : delta < -0.001 ? "text-red-400" : "text-text-muted"}`}>
            {values[values.length - 1].toFixed(1)}
          </div>
          <div className="text-[10px] text-text-muted">{fmtDate(snapshots[snapshots.length - 1].snapshot_date)}</div>
        </div>
      </div>
    </div>
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
  const [showExport, setShowExport] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  const { cardTypes, typesLoading, groupedCards } = useCardTypes(
    deck?.cards ?? [],
    deck?.commander ?? ""
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/decks/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        const { snapshots: snaps, ...deckData } = data;
        setDeck(deckData);
        if (Array.isArray(snaps)) setSnapshots(snaps);
      })
      .catch(() => setError("Deck not found"))
      .finally(() => setLoading(false));
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
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium glass text-text-muted hover:text-text border border-border transition-colors cursor-pointer"
            >
              <ClipboardCopy className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={handleShare}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
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
            <div className="glass rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="text-sm font-semibold">Power Rank History</h2>
                <span
                  className={`group relative text-sm font-mono font-semibold cursor-help ${trendColor}`}
                  title=""
                >
                  {sign}{delta.toFixed(2)} all time
                  <span className="pointer-events-none absolute right-0 top-full mt-1.5 z-20 w-64 rounded-lg glass border border-border px-3 py-2 text-xs font-normal text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    Total pair power score change since your first recorded snapshot. It&apos;s a raw sum across all card pairs — not a ranking position — so large numbers are normal.
                  </span>
                </span>
              </div>
              <PowerRankChart snapshots={snapshots} />
            </div>
          );
        })()}

      </main>

      {showExport && deck && (
        <ExportDeckModal
          deckName={deck.deck_name || deck.commander || "Unnamed Deck"}
          cards={deck.cards}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
