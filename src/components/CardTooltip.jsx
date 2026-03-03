import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

function getScryfallUrl(cardName) {
  return `https://api.scryfall.com/cards/named?format=image&exact=${encodeURIComponent(cardName)}&version=normal`;
}

export default function CardTooltip({ cardName, children }) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef(null);
  const spanRef = useRef(null);

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      if (!spanRef.current) return;
      const rect = spanRef.current.getBoundingClientRect();
      const tooltipWidth = 266; // 250 + padding
      const tooltipHeight = 365;

      let left = rect.right + 8;
      let top = rect.top;

      // Flip left if it would overflow the viewport
      if (left + tooltipWidth > window.innerWidth) {
        left = rect.left - tooltipWidth - 8;
      }
      // Prevent going off the bottom
      if (top + tooltipHeight > window.innerHeight) {
        top = window.innerHeight - tooltipHeight - 8;
      }
      if (top < 8) top = 8;

      setPos({ top, left });
      setVisible(true);
    }, 100);
  }, []);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
    setLoaded(false);
    setErrored(false);
  }, []);

  return (
    <span
      ref={spanRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && !errored &&
        createPortal(
          <div
            className="fixed z-50 pointer-events-none"
            style={{ top: pos.top, left: pos.left }}
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
                onLoad={() => setLoaded(true)}
                onError={() => setErrored(true)}
              />
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
