import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { DeckAnalysis } from "../types";

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

async function fetchColorIdentity(commander: string): Promise<string[]> {
  if (!commander) return [];
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(commander)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.color_identity ?? [];
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
    async (commander: string, cards: string[], analysis: DeckAnalysis, deckName?: string) => {
      if (!userId) return null;

      const colorIdentity = await fetchColorIdentity(commander);

      const row = {
        user_id: userId,
        deck_name: deckName || commander || null,
        commander: commander || null,
        color_identity: colorIdentity,
        cards,
        power_rank: analysis.totalPowerRank,
        average_pair_power: analysis.averagePairPower,
        pairs_found: analysis.pairsFound,
        pairs_missing: analysis.pairsMissing,
        total_pairs: analysis.totalPairs,
        updated_at: new Date().toISOString(),
      };

      // Always insert as a new deck — users can save multiple variations
      const { data, error } = await supabase
        .from("decklists")
        .insert(row)
        .select()
        .single();
      if (!error && data) {
        setDecklists((prev) => [data, ...prev]);
      }
      return error ? null : data;
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
