import { Zap } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 glass">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <Zap className="w-6 h-6 text-accent" />
        <h1 className="text-lg font-bold tracking-tight">cEDH Power Ranker</h1>
      </div>
    </header>
  );
}
