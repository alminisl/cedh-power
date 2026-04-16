import { useState } from "react";
import { ClipboardPaste, Sparkles, Users, AlertTriangle, BookOpen, Link, Loader2 } from "lucide-react";
import { parseDeckList } from "../lib/deckAnalyzer";

const SAMPLE_DECK = `1 Thrasios, Triton Hero
1 Tymna the Weaver
1 Sol Ring
1 Mana Crypt
1 Mana Vault
1 Grim Monolith
1 Chrome Mox
1 Mox Diamond
1 Lotus Petal
1 Jeweled Lotus
1 Mox Opal
1 Dark Ritual
1 Cabal Ritual
1 Rite of Flame
1 Pyretic Ritual
1 Desperate Ritual
1 Seething Song
1 Demonic Tutor
1 Vampiric Tutor
1 Imperial Seal
1 Mystical Tutor
1 Enlightened Tutor
1 Worldly Tutor
1 Personal Tutor
1 Lim-Dul's Vault
1 Thassa's Oracle
1 Demonic Consultation
1 Tainted Pact
1 Doomsday
1 Bolas's Citadel
1 Aetherflux Reservoir
1 Brain Freeze
1 Grapeshot
1 Rhystic Study
1 Necropotence
1 Sylvan Library
1 Ad Nauseam
1 Peer into the Abyss
1 Mystic Remora
1 Windfall
1 Wheel of Fortune
1 Brainstorm
1 Ponder
1 Preordain
1 Gitaxian Probe
1 Force of Will
1 Force of Negation
1 Pact of Negation
1 Mana Drain
1 Counterspell
1 Swan Song
1 Flusterstorm
1 Mental Misstep
1 Dispel
1 Spell Pierce
1 Fierce Guardianship
1 Deadly Rollick
1 Deflecting Swat
1 Toxic Deluge
1 Swords to Plowshares
1 Arcane Signet
1 Talisman of Curiosity
1 Talisman of Dominance
1 Talisman of Progress
1 Fellwar Stone
1 Sensei's Divining Top
1 Crop Rotation
1 Nature's Claim
1 Chain of Vapor
1 Noxious Revival
1 Carpet of Flowers
1 Deathrite Shaman
1 Command Tower
1 Mana Confluence
1 City of Brass
1 Gemstone Mine
1 Forbidden Orchard
1 Tarnished Citadel
1 Underground Sea
1 Tropical Island
1 Tundra
1 Bayou
1 Savannah
1 Scrubland
1 Watery Grave
1 Breeding Pool
1 Hallowed Fountain
1 Overgrown Tomb
1 Temple Garden
1 Godless Shrine
1 Flooded Strand
1 Polluted Delta
1 Verdant Catacombs
1 Marsh Flats
1 Misty Rainforest
1 Windswept Heath
1 Island
1 Swamp
1 Plains
1 Forest`;

interface DeckInputProps {
  onAnalyze: (cards: string[], commander: string) => void;
  disabled: boolean;
  text: string;
  onTextChange: (text: string) => void;
}

export default function DeckInput({ onAnalyze, disabled, text, onTextChange }: DeckInputProps) {
  const [partners, setPartners] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

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

  function loadSample() {
    onTextChange(SAMPLE_DECK);
    setPartners(true);
  }

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch(`/api/import-deck?url=${encodeURIComponent(importUrl.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Import failed");
      } else {
        onTextChange(data.decklist);
        setImportUrl("");
        setShowImport(false);
      }
    } catch {
      setImportError("Network error — please try again");
    }
    setImporting(false);
  }

  return (
    <div className="glass rounded-xl p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardPaste className="w-5 h-5 text-accent" />
        <h2 className="text-base font-semibold">Paste Your Deck List</h2>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowImport((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
            title="Import from Moxfield or Archidekt"
          >
            <Link className="w-3.5 h-3.5" />
            Import URL
          </button>
          <button
            onClick={loadSample}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Sample deck
          </button>
        </div>
      </div>

      {showImport && (
        <div className="mb-4 space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://www.moxfield.com/decks/… or archidekt.com/decks/…"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={handleImport}
              disabled={importing || !importUrl.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-light text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
            </button>
          </div>
          {importError && (
            <p className="text-xs text-red-400">{importError}</p>
          )}
        </div>
      )}

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
