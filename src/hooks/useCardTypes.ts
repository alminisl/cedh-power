import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { ScryfallCardData } from "../types";

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

export type CardCategory = (typeof TYPE_CATEGORIES)[number];

function categorizeCard(typeLine: string, isCommander: boolean): CardCategory {
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

const SCRYFALL_CACHE_KEY = "scryfall_card_cache_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function loadCache(): Record<string, { data: ScryfallCardData; ts: number }> {
  try {
    return JSON.parse(localStorage.getItem(SCRYFALL_CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, { data: ScryfallCardData; ts: number }>) {
  try {
    localStorage.setItem(SCRYFALL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage quota exceeded — skip silently
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchCardTypes(cardNames: string[]): Promise<Map<string, ScryfallCardData>> {
  const result = new Map<string, ScryfallCardData>();
  const now = Date.now();
  const cache = loadCache();

  const toFetch: string[] = [];
  for (const name of cardNames) {
    const entry = cache[name];
    if (entry && now - entry.ts < CACHE_TTL_MS) {
      result.set(name, entry.data);
    } else {
      toFetch.push(name);
    }
  }

  if (toFetch.length === 0) return result;

  for (let i = 0; i < toFetch.length; i += 75) {
    if (i > 0) await sleep(100);
    const batch = toFetch.slice(i, i + 75);
    const identifiers = batch.map((name) => ({ name }));
    try {
      const res = await fetch("/api/scryfall/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers }),
      });
      if (res.ok) {
        const data = await res.json();
        for (const card of data.data ?? []) {
          const info: ScryfallCardData = {
            name: card.name,
            mana_cost: card.mana_cost ?? "",
            type_line: card.type_line ?? "",
            oracle_text: card.oracle_text,
            power: card.power,
            toughness: card.toughness,
            loyalty: card.loyalty,
            image_uris: card.image_uris,
            card_faces: card.card_faces,
            set_name: card.set_name ?? "",
            set: card.set ?? "",
            collector_number: card.collector_number ?? "",
            rarity: card.rarity ?? "",
            prices: card.prices ?? {},
          };
          result.set(card.name, info);
          cache[card.name] = { data: info, ts: now };
        }
      } else if (res.status === 429) {
        break;
      }
    } catch {
      // ignore network errors
    }
  }

  saveCache(cache);
  return result;
}

interface UseCardTypesResult {
  cardTypes: Map<string, ScryfallCardData>;
  typesLoading: boolean;
  groupedCards: Record<string, string[]> | null;
}

export function useCardTypes(
  cards: string[],
  commander: string
): UseCardTypesResult {
  const [cardTypes, setCardTypes] = useState<Map<string, ScryfallCardData>>(new Map());
  const [typesLoading, setTypesLoading] = useState(false);
  const loadingKey = useRef<string | null>(null);

  const load = useCallback(async (cardList: string[]) => {
    // Dedup and sort so swapping cards (same set, different order) doesn't re-fetch.
    const key = [...new Set(cardList)].sort().join(",");
    if (loadingKey.current === key) return;
    loadingKey.current = key;
    setTypesLoading(true);
    const types = await fetchCardTypes(cardList);
    setCardTypes(types);
    setTypesLoading(false);
    loadingKey.current = null;
  }, []);

  useEffect(() => {
    if (cards.length === 0) {
      setCardTypes((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }
    load(cards);
  }, [cards, load]);

  const groupedCards = useMemo(() => {
    if (cardTypes.size === 0) return null;
    const groups: Record<string, string[]> = {};
    for (const cat of TYPE_CATEGORIES) groups[cat] = [];

    const commanderNames = new Set(
      commander.split(" / ").map((c) => c.trim()).filter(Boolean)
    );

    for (const cardName of cards) {
      const info = cardTypes.get(cardName);
      const isCommander = commanderNames.has(cardName);
      const category = info
        ? categorizeCard(info.type_line, isCommander)
        : isCommander
        ? "Commander"
        : "Other";
      groups[category].push(cardName);
    }

    for (const cat of TYPE_CATEGORIES) groups[cat].sort();

    return groups;
  }, [cards, commander, cardTypes]);

  return { cardTypes, typesLoading, groupedCards };
}
