import "mana-font/css/mana.css";

function symbolToClass(token: string): string {
  const s = token.toLowerCase();
  if (s === "t") return "ms-tap";
  if (s === "q") return "ms-untap";
  // hybrid {W/U} → "wu", phyrexian {W/P} → "wp", twobrid {2/W} → "2w"
  return `ms-${s.replace("/", "")}`;
}

interface ManaSymbolsProps {
  cost: string;
  className?: string;
}

export default function ManaSymbols({ cost, className = "" }: ManaSymbolsProps) {
  const tokens = [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {tokens.map((token, i) => (
        <i
          key={i}
          className={`ms ms-cost ms-shadow ${symbolToClass(token)}`}
          title={`{${token}}`}
        />
      ))}
    </span>
  );
}
