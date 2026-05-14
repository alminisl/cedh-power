import { useState, useEffect, useRef, useMemo } from "react";
import { BookOpen, Upload, Trash2, Loader2, Eye, Download, X, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface Primer {
  id: string;
  title: string;
  commander: string;
  deck_id: string | null;
  file_key: string;
  file_name: string;
  uploaded_by: string | null;
  created_at: string;
  thumbnail_key: string | null;
}

interface DeckOption {
  id: string;
  deck_name: string | null;
  commander: string | null;
}

const ADMIN_EMAILS = ["oromier@gmail.com", "mansbredelius@gmail.com"];

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PrimersPage() {
  const { user } = useAuth();
  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email ?? "");

  const [primers, setPrimers] = useState<Primer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return primers;
    return primers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.commander.toLowerCase().includes(q)
    );
  }, [primers, search]);

  useEffect(() => {
    fetch("/api/primers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPrimers(data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function openPdf(id: string, type: "view" | "download") {
    setActionLoading(`${id}-${type}`);
    try {
      const res = await fetch(`/api/primers/${id}/download-url?type=${type}`);
      const { url } = await res.json();
      if (url) window.open(url, "_blank");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/primers/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_UPLOAD_SECRET}` },
    });
    setPrimers((prev) => prev.filter((p) => p.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <BookOpen className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-bold">Primers</h1>
        <span className="text-sm text-text-muted">
          {filtered.length}{search.trim() ? ` / ${primers.length}` : ""} primer{filtered.length !== 1 ? "s" : ""}
        </span>
        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="ml-auto flex items-center gap-2 bg-accent hover:bg-accent/80 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload Primer
          </button>
        )}
      </div>

      {primers.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or commander..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : primers.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-text-muted">No primers uploaded yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-text-muted">No primers match "{search}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((primer) => (
            primer.thumbnail_key ? (
              <div
                key={primer.id}
                className="relative rounded-xl overflow-hidden border border-border/50 hover:border-accent/30 group transition-colors aspect-[3/4]"
              >
                <img
                  src={`/api/primers/${primer.id}/thumbnail`}
                  alt={primer.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 pb-3.5 px-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[0.8rem] font-semibold leading-tight text-white">{primer.title}</h3>
                      <p className="text-[0.72rem] text-white/60 mt-0.5 truncate">{primer.commander}</p>
                    </div>
                    {isAdmin && (
                      confirmDeleteId === primer.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleDelete(primer.id)} className="text-[0.65rem] text-red-400 hover:text-red-300 font-semibold cursor-pointer">Delete</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-[0.65rem] text-white/50 hover:text-white cursor-pointer ml-1">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(primer.id)} className="opacity-0 group-hover:opacity-100 text-white/50 hover:text-red-400 transition-all cursor-pointer shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openPdf(primer.id, "view")}
                      disabled={actionLoading === `${primer.id}-view`}
                      className="flex items-center gap-1 px-2.5 py-1 bg-accent/20 hover:bg-accent/35 text-accent text-[0.65rem] font-medium rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === `${primer.id}-view` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                      View
                    </button>
                    <button
                      onClick={() => openPdf(primer.id, "download")}
                      disabled={actionLoading === `${primer.id}-download`}
                      className="flex items-center gap-1 px-2.5 py-1 border border-white/20 hover:border-white/40 text-white/60 hover:text-white text-[0.65rem] font-medium rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === `${primer.id}-download` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      Download
                    </button>
                  </div>
                  <p className="text-[0.62rem] text-white/40">{formatDate(primer.created_at)}</p>
                </div>
              </div>
            ) : (
              <div
                key={primer.id}
                className="relative rounded-xl overflow-hidden border border-border/50 hover:border-accent/30 group transition-colors"
              >
                <img
                  src={`/api/card-image?name=${encodeURIComponent(primer.commander.split(" / ")[0])}&version=art_crop`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-15 group-hover:opacity-25 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
                <div className="relative p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-tight">{primer.title}</h3>
                      <p className="text-sm text-text-muted mt-0.5 truncate">{primer.commander}</p>
                    </div>
                    {isAdmin && (
                      confirmDeleteId === primer.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleDelete(primer.id)} className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer">Delete</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-text-muted hover:text-text cursor-pointer ml-1">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(primer.id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all cursor-pointer shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openPdf(primer.id, "view")}
                      disabled={actionLoading === `${primer.id}-view`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/15 hover:bg-accent/25 text-accent text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === `${primer.id}-view` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                      View
                    </button>
                    <button
                      onClick={() => openPdf(primer.id, "download")}
                      disabled={actionLoading === `${primer.id}-download`}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:border-accent/30 text-text-muted hover:text-text text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === `${primer.id}-download` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Download
                    </button>
                  </div>
                  <p className="text-xs text-text-muted/60">{formatDate(primer.created_at)}</p>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={(primer) => {
            setPrimers((prev) => [primer, ...prev]);
            setShowUpload(false);
          }}
          userEmail={user?.email ?? ""}
        />
      )}
    </main>
  );
}

async function generatePdfThumbnail(file: File): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas to blob failed"))),
      "image/png"
    );
  });
}

interface UploadModalProps {
  onClose: () => void;
  onSuccess: (primer: Primer) => void;
  userEmail: string;
}

type UploadStatus = "idle" | "uploading" | "saving" | "error";

function UploadModal({ onClose, onSuccess, userEmail }: UploadModalProps) {
  const [title, setTitle] = useState("");
  const [commanderMode, setCommanderMode] = useState<"select" | "manual">("select");
  const [manualCommander, setManualCommander] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [selectedCommander, setSelectedCommander] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [decksLoading, setDecksLoading] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [barWidth, setBarWidth] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "uploading") {
      setTimeout(() => setBarWidth(65), 50);
    } else if (status === "saving") {
      setBarWidth(90);
    } else {
      setBarWidth(0);
    }
  }, [status]);

  useEffect(() => {
    if (commanderMode !== "select") return;
    setDecksLoading(true);
    fetch("/api/decks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDecks(data);
      })
      .finally(() => setDecksLoading(false));
  }, [commanderMode]);

  function handleDeckSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedDeckId(id);
    const deck = decks.find((d) => d.id === id);
    setSelectedCommander(deck?.commander ?? "");
  }

  const commander = commanderMode === "manual" ? manualCommander : selectedCommander;
  const busy = status === "uploading" || status === "saving";
  const canSubmit = !busy && title.trim() && commander.trim() && !!file;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim() || !commander.trim()) return;

    const secret = process.env.NEXT_PUBLIC_UPLOAD_SECRET;
    setErrorMsg("");

    try {
      setStatus("uploading");

      const [thumbnailBlob, urlRes] = await Promise.all([
        generatePdfThumbnail(file).catch(() => null),
        fetch("/api/primers/upload-url", {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}` },
        }),
      ]);

      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { url, key, thumbUrl, thumbKey } = await urlRes.json();

      const uploads: Promise<Response>[] = [
        fetch(url, { method: "PUT", body: file, headers: { "Content-Type": "application/pdf" } }),
      ];
      if (thumbnailBlob && thumbUrl) {
        uploads.push(fetch(thumbUrl, { method: "PUT", body: thumbnailBlob, headers: { "Content-Type": "image/png" } }));
      }

      const [uploadRes] = await Promise.all(uploads);
      if (!uploadRes.ok) throw new Error("File upload to storage failed");

      setStatus("saving");

      const metaRes = await fetch("/api/primers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          commander: commander.trim(),
          deck_id: commanderMode === "select" ? selectedDeckId || null : null,
          file_key: key,
          file_name: file.name,
          uploaded_by: userEmail,
          thumbnail_key: thumbnailBlob && thumbKey ? thumbKey : null,
        }),
      });
      if (!metaRes.ok) {
        const body = await metaRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save primer");
      }

      const primer = await metaRes.json();
      onSuccess(primer);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative glass rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Upload Primer</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ral, Monsoon Mage Primer v1"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Commander</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCommanderMode("select")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  commanderMode === "select"
                    ? "bg-accent/15 text-accent"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Select from decks
              </button>
              <button
                type="button"
                onClick={() => setCommanderMode("manual")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  commanderMode === "manual"
                    ? "bg-accent/15 text-accent"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Enter manually
              </button>
            </div>

            {commanderMode === "select" ? (
              decksLoading ? (
                <div className="flex items-center gap-2 text-sm text-text-muted py-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading decks...
                </div>
              ) : (
                <>
                  <select
                    value={selectedDeckId}
                    onChange={handleDeckSelect}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="">Select a deck...</option>
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.deck_name && d.commander && d.deck_name !== d.commander
                          ? `${d.deck_name} (${d.commander})`
                          : d.deck_name || d.commander || "Unnamed Deck"}
                      </option>
                    ))}
                  </select>
                  {selectedCommander && (
                    <p className="text-xs text-text-muted">Commander: {selectedCommander}</p>
                  )}
                </>
              )
            ) : (
              <input
                type="text"
                value={manualCommander}
                onChange={(e) => setManualCommander(e.target.value)}
                placeholder="e.g. Ral, Monsoon Mage"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">PDF File</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="w-full border border-dashed border-border hover:border-accent/50 rounded-lg px-3 py-4 text-sm text-center cursor-pointer transition-colors"
            >
              {file ? (
                <span className="text-text">
                  {file.name}{" "}
                  <span className="text-text-muted">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                </span>
              ) : (
                <span className="text-text-muted">Click to select PDF...</span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && file.size > 50 * 1024 * 1024 && (
              <p className="text-xs text-yellow-400">
                Large file ({(file.size / 1024 / 1024).toFixed(0)} MB) — upload may take a moment.
              </p>
            )}
          </div>

          {busy && (
            <div className="space-y-2 py-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">
                  {status === "saving" ? "Saving metadata..." : "Uploading PDF to storage..."}
                </span>
                <span className="text-accent font-mono">{barWidth}%</span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{
                    width: `${barWidth}%`,
                    transition: status === "uploading"
                      ? "width 6000ms cubic-bezier(0.4, 0, 0.2, 1)"
                      : "width 400ms ease",
                  }}
                />
              </div>
            </div>
          )}

          {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-text border border-border hover:border-accent/30 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "uploading" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : status === "saving" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
