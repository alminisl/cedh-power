interface PowerRankHeroProps {
  value: number;
}

export default function PowerRankHero({ value }: PowerRankHeroProps) {
  return (
    <div className="glass glow-orange rounded-2xl p-8 text-center max-w-md mx-auto">
      <p className="text-sm font-medium text-text-muted uppercase tracking-widest mb-2">
        Total Power Rank
      </p>
      <p className="text-6xl font-black text-accent text-glow-orange">
        {value.toFixed(2)}
      </p>
    </div>
  );
}
