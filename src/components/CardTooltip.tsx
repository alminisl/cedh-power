import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

const imageCache = new Set<string>();

function getScryfallUrl(cardName: string): string {
  return `https://api.scryfall.com/cards/named?format=image&exact=${encodeURIComponent(cardName)}&version=normal`;
}

interface CardTooltipProps {
  cardName: string;
  children: ReactNode;
}

export default function CardTooltip({ cardName, children }: CardTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(() => imageCache.has(cardName));
  const [errored, setErrored] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const showRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return () => {
      if (showRef.current) clearTimeout(showRef.current);
      if (hideRef.current) clearTimeout(hideRef.current);
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hideRef.current) clearTimeout(hideRef.current);
    showRef.current = setTimeout(() => {
      if (!spanRef.current) return;
      const rect = spanRef.current.getBoundingClientRect();
      const tooltipWidth = 266;
      const tooltipHeight = 365;

      let left = rect.right + 8;
      let top = rect.top;

      if (left + tooltipWidth > window.innerWidth) {
        left = rect.left - tooltipWidth - 8;
      }
      if (top + tooltipHeight > window.innerHeight) {
        top = window.innerHeight - tooltipHeight - 8;
      }
      if (top < 8) top = 8;

      setPos({ top, left });
      setVisible(true);
    }, 150);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (showRef.current) clearTimeout(showRef.current);
    hideRef.current = setTimeout(() => {
      setVisible(false);
    }, 100);
  }, []);

  const handleLoad = useCallback(() => {
    imageCache.add(cardName);
    setLoaded(true);
  }, [cardName]);

  return (
    <span
      ref={spanRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="cursor-pointer"
    >
      {children}
      {createPortal(
        <div
          className="fixed z-[9999] pointer-events-none transition-opacity duration-150"
          style={{
            top: pos.top,
            left: pos.left,
            opacity: visible && !errored ? 1 : 0,
            visibility: visible && !errored ? "visible" : "hidden",
          }}
        >
          <div className="glass rounded-lg p-1.5 shadow-xl border border-border/50">
            {!loaded && (
              <div className="w-[250px] h-[349px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
              </div>
            )}
            <img
              src={getScryfallUrl(cardName)}
              alt={cardName}
              width={250}
              className={`rounded-md ${loaded ? "block" : "hidden"}`}
              onLoad={handleLoad}
              onError={() => setErrored(true)}
            />
          </div>
        </div>,
        document.body,
      )}
    </span>
  );
}
