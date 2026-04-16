import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface CommanderPercentileResult {
  percentile: number | null;
  totalDecks: number;
  loading: boolean;
}

export function useCommanderPercentile(
  commander: string,
  averagePairPower: number
): CommanderPercentileResult {
  const [state, setState] = useState<CommanderPercentileResult>({
    percentile: null,
    totalDecks: 0,
    loading: false,
  });

  useEffect(() => {
    const firstCommander = commander.split(" / ")[0].trim();
    if (!firstCommander) {
      setState({ percentile: null, totalDecks: 0, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    supabase
      .from("decklists")
      .select("average_pair_power")
      .ilike("commander", `%${firstCommander}%`)
      .then(({ data }) => {
        if (!data || data.length < 3) {
          setState({ percentile: null, totalDecks: data?.length ?? 0, loading: false });
          return;
        }
        // Lower average_pair_power = stronger deck.
        // "betterThanUs" = decks that are WEAKER (higher avgPairPower) → we beat them.
        const betterThanUs = data.filter((d) => d.average_pair_power > averagePairPower).length;
        const percentile = Math.round((betterThanUs / data.length) * 100);
        setState({ percentile, totalDecks: data.length, loading: false });
      });
  }, [commander, averagePairPower]);

  return state;
}
