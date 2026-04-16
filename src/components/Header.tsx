import { Zap, LogIn, LogOut, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  customPairCount?: number;
  isAdmin?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({ customPairCount = 0, isAdmin = false, onToggleSidebar }: HeaderProps) {
  const { pathname } = useLocation();
  const { user, loading, signInWithDiscord, signOut } = useAuth();

  const navLinks = [
    { to: "/", label: "Analyzer" },
    { to: "/decks", label: "Decks" },
    { to: "/compare", label: "Compare" },
    { to: "/leaderboard", label: "Leaderboard" },
    ...(isAdmin ? [{ to: "/add", label: "Add Data" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Zap className="w-6 h-6 text-accent" />
          <h1 className="text-base sm:text-lg font-bold tracking-tight">cEDH Power Ranker</h1>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent px-1.5 py-0.5 rounded hidden sm:inline">Alpha</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1 ml-auto">
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

        {/* Mobile nav */}
        <nav className="flex sm:hidden items-center gap-1 ml-auto overflow-x-auto">
          {navLinks.map(({ to, label }) => {
            const active =
              to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Auth */}
        <div className="shrink-0">
          {loading ? null : user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name}
                className="w-7 h-7 rounded-full"
              />
              <span className="text-sm font-medium hidden md:block">
                {user.user_metadata.full_name ?? user.user_metadata.name}
              </span>
              <button
                onClick={signOut}
                className="hidden sm:flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithDiscord}
              className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Discord</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}
        </div>

        {/* Mobile sidebar toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
}
