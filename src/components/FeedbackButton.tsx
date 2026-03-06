import { useState } from "react";
import { MessageSquare, X, Send, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function FeedbackButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!message.trim()) return;
    setSending(true);
    setError("");

    const { error: err } = await supabase.from("feedback").insert({
      user_id: user?.id ?? null,
      email: user?.email ?? (email.trim() || null),
      message: message.trim(),
    });

    setSending(false);
    if (err) {
      setError("Failed to send. Try again.");
    } else {
      setSent(true);
      setMessage("");
      setEmail("");
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 2000);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 bg-surface-light hover:bg-surface-light/80 border border-border text-text-muted hover:text-text text-xs font-medium px-3 py-2 rounded-full shadow-lg transition-colors cursor-pointer"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-end p-4 sm:items-center sm:justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative glass rounded-xl p-5 w-full max-w-sm shadow-2xl border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Send Feedback</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!user && (
              <input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
            )}

            <textarea
              placeholder="Bug report, feature request, or just say hi..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full h-28 bg-bg border border-border rounded-lg p-3 text-sm text-text placeholder-text-muted resize-none focus:outline-none focus:border-accent transition-colors"
            />

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!message.trim() || sending}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                sent
                  ? "bg-green-500/20 text-green-400"
                  : "bg-accent hover:bg-accent-light text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {sent ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Sent!
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {sending ? "Sending..." : "Send"}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
