import { Zap, LogIn, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  customPairCount?: number;
  isAdmin?: boolean;
}

export default function Header({ customPairCount = 0, isAdmin = false }: HeaderProps) {
  const { pathname } = useLocation();
  const { user, loading, signInWithDiscord, signOut } = useAuth();

  const navLinks = [
    { to: "/", label: "Analyzer" },
    { to: "/decks", label: "Decks" },
    { to: "/leaderboard", label: "Leaderboard" },
    ...(isAdmin ? [{ to: "/add", label: "Add Data" }] : []),
  ];

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

        {/* Auth */}
        <div className="shrink-0">
          {loading ? null : user ? (
            <div className="flex items-center gap-3">
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name}
                className="w-7 h-7 rounded-full"
              />
              <span className="text-sm font-medium hidden sm:block">
                {user.user_metadata.full_name ?? user.user_metadata.name}
              </span>
              <button
                onClick={signOut}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithDiscord}
              className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Discord
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
