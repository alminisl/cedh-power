import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, CheckCircle } from "lucide-react";

interface ExportDeckModalProps {
  deckName: string;
  cards: string[];
  onClose: () => void;
}

export default function ExportDeckModal({ deckName, cards, onClose }: ExportDeckModalProps) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const decklist = cards.map((c) => `1 ${c}`).join("\n");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleCopy() {
    navigator.clipboard.writeText(decklist).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSelectAll() {
    textareaRef.current?.select();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative glass rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] min-h-[60vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold">{deckName || "Decklist"}</h2>
            <p className="text-xs text-text-muted">{cards.length} cards</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                copied
                  ? "bg-green-500/20 text-green-400 border border-green-500/40"
                  : "bg-accent hover:bg-accent-light text-white"
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy all
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Decklist textarea */}
        <textarea
          ref={textareaRef}
          readOnly
          value={decklist}
          onClick={handleSelectAll}
          className="flex-1 min-h-0 w-full bg-bg font-mono text-sm text-text p-4 resize-none focus:outline-none rounded-b-2xl"
          spellCheck={false}
        />
      </div>
    </div>,
    document.body
  );
}
