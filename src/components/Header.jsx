import { Zap } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Analyzer" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/add", label: "Add Data" },
];

export default function Header({ customPairCount = 0 }) {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Zap className="w-6 h-6 text-accent" />
          <h1 className="text-lg font-bold tracking-tight">cEDH Power Ranker</h1>
        </Link>

        <nav className="flex items-center gap-1 ml-auto">
          {navLinks.map(({ to, label }) => {
            const active =
              to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {label}
                {to === "/add" && customPairCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold bg-accent text-white rounded-full">
                    {customPairCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
