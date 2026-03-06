import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border/50 py-6">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs text-text-muted">
        <span>cEDH Power Ranker &middot; Alpha</span>
        <div className="flex items-center gap-4">
          <Link to="/about" className="hover:text-text transition-colors">
            About
          </Link>
          <Link to="/leaderboard" className="hover:text-text transition-colors">
            Leaderboard
          </Link>
        </div>
      </div>
    </footer>
  );
}
