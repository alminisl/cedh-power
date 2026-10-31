import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { authHeader } from "../lib/authHeader";

export interface Decklist {
  id: string;
  user_id: string;
  deck_name: string | null;
  commander: string | null;
  color_identity: string[];
  cards: string[];
  power_rank: number;
  average_pair_power: number;
  pairs_found: number;
  pairs_missing: number;
  total_pairs: number;
  created_at: string;
  updated_at: string;
}

const colorIdentityCache = new Map<string, string[]>();

async function fetchColorIdentity(commander: string): Promise<string[]> {
  if (!commander) return [];
  if (colorIdentityCache.has(commander)) return colorIdentityCache.get(commander)!;
  try {
    const res = await fetch("/api/scryfall/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: [{ name: commander }] }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const identity = data.data?.[0]?.color_identity ?? [];
    colorIdentityCache.set(commander, identity);
    return identity;
  } catch {
    return [];
  }
}

export function useDecklists(userId: string | undefined, opts?: { allUsers?: boolean }) {
  const [decklists, setDecklists] = useState<Decklist[]>([]);
  const [loading, setLoading] = useState(false);
  const allUsers = opts?.allUsers ?? false;

  const fetchDecklists = useCallback(async () => {
    if (!allUsers && !userId) return;
    setLoading(true);
    let query = supabase
      .from("decklists")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!allUsers && userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (!error && data) setDecklists(data);
    setLoading(false);
  }, [userId, allUsers]);

  useEffect(() => {
    fetchDecklists();
  }, [fetchDecklists]);

  const saveDeck = useCallback(
    async (commander: string, cards: string[], deckName?: string) => {
      if (!userId) return null;

      const colorIdentity = await fetchColorIdentity(commander);

      // The server computes the score so it can't be spoofed from the browser.
      // Always inserts a new deck — users can save multiple variations.
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ commander, cards, deck_name: deckName, color_identity: colorIdentity }),
      });
      if (!res.ok) return null;
      const data: Decklist = await res.json();
      setDecklists((prev) => [data, ...prev]);
      return data;
    },
    [userId]
  );

  const deleteDeck = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("decklists").delete().eq("id", id);
      if (!error) {
        setDecklists((prev) => prev.filter((d) => d.id !== id));
      }
    },
    []
  );

  return { decklists, loading, saveDeck, deleteDeck, refetch: fetchDecklists };
}
