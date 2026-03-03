import PowerRankHero from "./PowerRankHero";
import StatsGrid from "./StatsGrid";
import CardBreakdownTable from "./CardBreakdownTable";

export default function ResultsDashboard({ results }) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <PowerRankHero value={results.averagePairPower} />
      <StatsGrid stats={results} />
      <CardBreakdownTable breakdown={results.cardBreakdown} />
    </div>
  );
}
