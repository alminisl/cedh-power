import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { DeckAnalysis } from "../types";

export interface Decklist {
  id: string;
  user_id: string;
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

export function useDecklists(userId: string | undefined) {
  const [decklists, setDecklists] = useState<Decklist[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDecklists = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("decklists")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (!error && data) setDecklists(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchDecklists();
  }, [fetchDecklists]);

  const saveDeck = useCallback(
    async (commander: string, cards: string[], analysis: DeckAnalysis) => {
      if (!userId) return null;

      // Upsert by commander name — update if same commander exists
      const existing = decklists.find(
        (d) => d.commander?.toLowerCase() === commander.toLowerCase()
      );

      const colorIdentity = await fetchColorIdentity(commander);

      const row = {
        user_id: userId,
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

      if (existing) {
        const { data, error } = await supabase
          .from("decklists")
          .update(row)
          .eq("id", existing.id)
          .select()
          .single();
        if (!error && data) {
          setDecklists((prev) =>
            prev.map((d) => (d.id === existing.id ? data : d))
          );
        }
        return error ? null : data;
      } else {
        const { data, error } = await supabase
          .from("decklists")
          .insert(row)
          .select()
          .single();
        if (!error && data) {
          setDecklists((prev) => [data, ...prev]);
        }
        return error ? null : data;
      }
    },
    [userId, decklists]
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
