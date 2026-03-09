import { useState, useRef, type FormEvent } from "react";
import { Plus, Upload, Trash2, FileText, Code, Database, Loader2, CheckCircle, History, RotateCcw } from "lucide-react";
import { uploadPairData, type UploadProgress } from "../lib/uploadPairData";
import { parseParquetFile } from "../lib/parseParquet";
import { useParquetVersions } from "../hooks/useParquetVersions";
import { useAuth } from "../context/AuthContext";
import type { PairData, PairStats } from "../types";

const WORKER_URL = "https://bucket.cedhpower.com";
const UPLOAD_SECRET = import.meta.env.VITE_UPLOAD_SECRET;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface AddDataPageProps {
  customPairs: PairData;
  onAddPair: (cardA: string, cardB: string, stats: PairStats) => void;
  onAddPairsBulk: (pairs: PairData) => void;
  onRemovePair: (key: string) => void;
  onClearAll: () => void;
  onReplacePairData?: (data: PairData) => void;
}

export default function AddDataPage({
  customPairs,
  onAddPair,
  onAddPairsBulk,
  onRemovePair,
  onClearAll,
  onReplacePairData,
}: AddDataPageProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"parquet" | "manual" | "bulk" | "versions">("parquet");

  // Parquet upload state
  const [parquetUploading, setParquetUploading] = useState(false);
  const [parquetError, setParquetError] = useState("");
  const [parquetSuccess, setParquetSuccess] = useState("");
  const [parquetFileName, setParquetFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const parquetRef = useRef<HTMLInputElement>(null);

  // Manual entry state
  const [cardA, setCardA] = useState("");
  const [cardB, setCardB] = useState("");
  const [power, setPower] = useState("");
  const [winRate, setWinRate] = useState("");
  const [count, setCount] = useState("");
  const [logMult, setLogMult] = useState("");
  const [manualError, setManualError] = useState("");

  // Bulk import state
  const [bulkFormat, setBulkFormat] = useState<"csv" | "json">("csv");
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [confirmClear, setConfirmClear] = useState(false);

  // Versions state
  const { versions, loading: versionsLoading, refetch: refetchVersions } = useParquetVersions();
  const [activatingKey, setActivatingKey] = useState<string | null>(null);
  const [versionError, setVersionError] = useState("");
  const [confirmActivateKey, setConfirmActivateKey] = useState<string | null>(null);

  const pairEntries = Object.entries(customPairs);
  const storageSize = formatBytes(
    new Blob([JSON.stringify(customPairs)]).size
  );

  // --- Parquet upload ---
  async function handleParquetUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setParquetFileName(file.name);
    setParquetError("");
    setParquetSuccess("");
    setParquetUploading(true);
    setUploadProgress(null);

    try {
      const { pairData, pairCount, cardCount } = await uploadPairData(
        file,
        user?.email ?? undefined,
        setUploadProgress
      );
      onReplacePairData?.(pairData);
      setParquetSuccess(
        `Replaced pair data: ${pairCount.toLocaleString()} pairs across ${cardCount.toLocaleString()} cards (${formatBytes(file.size)})`
      );
      refetchVersions();
    } catch (err) {
      setParquetError((err as Error).message);
    } finally {
      setParquetUploading(false);
      if (!parquetError) {
        setTimeout(() => setUploadProgress(null), 3000);
      }
    }
  }

  // --- Activate version ---
  async function handleActivateVersion(r2Key: string) {
    setActivatingKey(r2Key);
    setVersionError("");
    setConfirmActivateKey(null);

    try {
      // 1. Fetch parquet from worker
      const res = await fetch(`${WORKER_URL}/parquet-version/${encodeURIComponent(r2Key)}`, {
        headers: { Authorization: `Bearer ${UPLOAD_SECRET}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch parquet: ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], "version.parquet");

      // 2. Parse parquet client-side
      const pairData = await parseParquetFile(file);

      // 3. Upload parsed JSON as active pair data
      const jsonRes = await fetch(`${WORKER_URL}/pair-data`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${UPLOAD_SECRET}`,
        },
        body: JSON.stringify(pairData),
      });
      if (!jsonRes.ok) throw new Error(`Failed to update active data: ${jsonRes.status}`);

      // 4. Replace in-memory data
      onReplacePairData?.(pairData);
    } catch (err) {
      setVersionError((err as Error).message);
    } finally {
      setActivatingKey(null);
    }
  }

  // --- Manual entry ---
  function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    setManualError("");

    const a = cardA.trim();
    const b = cardB.trim();
    if (!a || !b) return setManualError("Both card names are required.");
    if (a.toLowerCase() === b.toLowerCase())
      return setManualError("Cards must be different.");
    const p = parseFloat(power);
    if (isNaN(p) || p < 0 || p > 10)
      return setManualError("Power must be between 0 and 10.");

    const stats: PairStats = { p };
    if (winRate.trim()) stats.w = parseFloat(winRate) || 0;
    if (count.trim()) stats.c = parseInt(count, 10) || 0;
    if (logMult.trim()) stats.l = parseFloat(logMult) || 0;

    onAddPair(a, b, stats);
    setCardA("");
    setCardB("");
    setPower("");
    setWinRate("");
    setCount("");
    setLogMult("");
  }

  // --- Bulk import ---
  function parseCsv(text: string): PairData {
    const lines = text.split("\n").filter((l) => l.trim());
    const pairs: PairData = {};
    const startIdx = lines[0] && /card/i.test(lines[0]) ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(",").map((s) => s.trim());
      if (cols.length < 3) continue;
      const [a, b] = [cols[0], cols[1]].sort();
      const key = `${a}|||${b}`;
      const stats: PairStats = { p: parseFloat(cols[2]) || 0 };
      if (cols[3]) stats.w = parseFloat(cols[3]) || 0;
      if (cols[4]) stats.c = parseInt(cols[4], 10) || 0;
      if (cols[5]) stats.l = parseFloat(cols[5]) || 0;
      pairs[key] = stats;
    }
    return pairs;
  }

  function parseJson(text: string): PairData {
    const obj = JSON.parse(text);
    const pairs: PairData = {};
    for (const [key, val] of Object.entries(obj)) {
      if (!key.includes("|||")) continue;
      const v = val as Record<string, number>;
      pairs[key] = {
        p: v.p ?? v.PowerRank ?? 0,
        w: v.w ?? v.Winrate ?? 0,
        c: v.c ?? v.ConfidentChallenges ?? 0,
        l: v.l ?? v.LogMultiplier ?? 0,
      };
    }
    return pairs;
  }

  function handleBulkImport() {
    setBulkError("");
    setBulkSuccess("");
    try {
      const pairs =
        bulkFormat === "csv" ? parseCsv(bulkText) : parseJson(bulkText);
      const count = Object.keys(pairs).length;
      if (count === 0) return setBulkError("No valid pairs found.");
      onAddPairsBulk(pairs);
      setBulkSuccess(`Imported ${count} pair${count !== 1 ? "s" : ""}.`);
      setBulkText("");
    } catch (err) {
      setBulkError("Parse error: " + (err as Error).message);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBulkText(ev.target?.result as string);
      if (file.name.endsWith(".json")) setBulkFormat("json");
      else setBulkFormat("csv");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Manage Data</h1>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab("parquet")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "parquet"
              ? "bg-accent text-white"
              : "glass text-text-muted hover:text-text"
          }`}
        >
          <Database className="w-4 h-4 inline mr-1 -mt-0.5" />
          Upload Parquet
        </button>
        <button
          onClick={() => setTab("versions")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "versions"
              ? "bg-accent text-white"
              : "glass text-text-muted hover:text-text"
          }`}
        >
          <History className="w-4 h-4 inline mr-1 -mt-0.5" />
          Versions
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "manual"
              ? "bg-accent text-white"
              : "glass text-text-muted hover:text-text"
          }`}
        >
          <Plus className="w-4 h-4 inline mr-1 -mt-0.5" />
          Manual Entry
        </button>
        <button
          onClick={() => setTab("bulk")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "bulk"
              ? "bg-accent text-white"
              : "glass text-text-muted hover:text-text"
          }`}
        >
          <Upload className="w-4 h-4 inline mr-1 -mt-0.5" />
          Bulk Import
        </button>
      </div>

      {/* Parquet Upload */}
      {tab === "parquet" && (
        <div className="glass rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold mb-1">Upload Parquet File</h2>
            <p className="text-sm text-text-muted">
              Upload <code className="text-accent">big_output.parquet</code> to replace the global pair data.
              The file is parsed in your browser, stored for all users, and the raw parquet is saved as a version backup.
            </p>
          </div>

          <div
            onClick={() => !parquetUploading && parquetRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              parquetUploading
                ? "border-accent/40 bg-accent/5 cursor-wait"
                : "border-border hover:border-accent/60 cursor-pointer"
            }`}
          >
            {parquetUploading ? (
              <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <p className="text-sm text-text-muted">
                  {uploadProgress?.label ?? "Starting..."}{" "}
                  <span className="text-text font-medium">{parquetFileName}</span>
                </p>
                <div className="w-full bg-border/40 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${uploadProgress?.percent ?? 0}%` }}
                  />
                </div>
                <span className="text-xs text-text-muted">{uploadProgress?.percent ?? 0}%</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Database className="w-8 h-8 text-text-muted" />
                <p className="text-sm text-text-muted">
                  Click to select <code>.parquet</code> file
                </p>
              </div>
            )}
          </div>

          <input
            ref={parquetRef}
            type="file"
            accept=".parquet"
            onChange={handleParquetUpload}
            className="hidden"
          />

          {parquetError && <p className="text-sm text-red-400">{parquetError}</p>}
          {parquetSuccess && (
            <p className="text-sm text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {parquetSuccess}
            </p>
          )}
        </div>
      )}

      {/* Versions */}
      {tab === "versions" && (
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold mb-1">Data Versions</h2>
              <p className="text-sm text-text-muted">
                View all uploaded parquet versions. Activate any version to make it the live dataset.
              </p>
            </div>
            <button
              onClick={refetchVersions}
              className="text-xs text-text-muted hover:text-text transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Refresh
            </button>
          </div>

          {versionError && <p className="text-sm text-red-400">{versionError}</p>}

          {versionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">
              No versions found. Upload a parquet file to create the first version.
            </p>
          ) : (
            <div className="space-y-3">
              {versions.map((v, i) => (
                <div
                  key={v.r2_key}
                  className={`rounded-lg border p-4 transition-colors ${
                    i === 0
                      ? "border-green-500/40 bg-green-500/5"
                      : "border-border bg-surface-light/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">
                          {v.original_filename ?? v.r2_key}
                        </span>
                        {i === 0 && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-500/20 text-green-400 whitespace-nowrap">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                        <span>{formatDate(v.uploaded)}</span>
                        <span>{v.pair_count.toLocaleString()} pairs</span>
                        <span>{v.card_count.toLocaleString()} cards</span>
                        <span>{formatBytes(v.size)}</span>
                        {v.uploaded_by && <span>by {v.uploaded_by}</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {i === 0 ? null : confirmActivateKey === v.r2_key ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-400">Apply this version?</span>
                          <button
                            onClick={() => handleActivateVersion(v.r2_key)}
                            disabled={activatingKey !== null}
                            className="text-xs font-semibold text-accent hover:text-accent-light cursor-pointer disabled:opacity-50"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmActivateKey(null)}
                            className="text-xs text-text-muted hover:text-text cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : activatingKey === v.r2_key ? (
                        <Loader2 className="w-4 h-4 text-accent animate-spin" />
                      ) : (
                        <button
                          onClick={() => setConfirmActivateKey(v.r2_key)}
                          disabled={activatingKey !== null}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Entry */}
      {tab === "manual" && (
        <form
          onSubmit={handleManualSubmit}
          className="glass rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">Card A</label>
              <input
                type="text"
                value={cardA}
                onChange={(e) => setCardA(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                placeholder="Sol Ring"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Card B</label>
              <input
                type="text"
                value={cardB}
                onChange={(e) => setCardB(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                placeholder="Mana Crypt"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">
                Power <span className="text-red-400">*</span>
              </label>
              <input
                type="number" step="any" value={power}
                onChange={(e) => setPower(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                placeholder="0-10"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Win Rate</label>
              <input
                type="number" step="any" value={winRate}
                onChange={(e) => setWinRate(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Count</label>
              <input
                type="number" value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Log Multiplier</label>
              <input
                type="number" step="any" value={logMult}
                onChange={(e) => setLogMult(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
          {manualError && <p className="text-sm text-red-400">{manualError}</p>}
          <button
            type="submit"
            className="bg-accent hover:bg-accent-light text-white font-semibold px-5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Add Pair
          </button>
        </form>
      )}

      {/* Bulk Import */}
      {tab === "bulk" && (
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setBulkFormat("csv")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  bulkFormat === "csv"
                    ? "bg-accent/20 text-accent border border-accent/40"
                    : "bg-bg border border-border text-text-muted"
                }`}
              >
                <FileText className="w-3 h-3" />
                CSV
              </button>
              <button
                onClick={() => setBulkFormat("json")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  bulkFormat === "json"
                    ? "bg-accent/20 text-accent border border-accent/40"
                    : "bg-bg border border-border text-text-muted"
                }`}
              >
                <Code className="w-3 h-3" />
                JSON
              </button>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-bg border border-border text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              Upload File
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full h-48 bg-bg border border-border rounded-lg p-4 text-sm font-mono text-text placeholder-text-muted resize-none focus:outline-none focus:border-accent transition-colors"
            placeholder={
              bulkFormat === "csv"
                ? "cardA,cardB,power,winRate,count,logMult\nSol Ring,Mana Crypt,7.5,6.2,1500,1.1"
                : '{\n  "Sol Ring|||Mana Crypt": { "p": 7.5, "w": 6.2, "c": 1500, "l": 1.1 }\n}'
            }
          />

          {bulkError && <p className="text-sm text-red-400">{bulkError}</p>}
          {bulkSuccess && <p className="text-sm text-green-400">{bulkSuccess}</p>}

          <button
            onClick={handleBulkImport}
            disabled={!bulkText.trim()}
            className="bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Import
          </button>
        </div>
      )}

      {/* Custom Pairs Table */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">
              Custom Pairs ({pairEntries.length})
            </h2>
            <span className="text-xs text-text-muted">{storageSize}</span>
          </div>
          {pairEntries.length > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Delete all?</span>
                <button
                  onClick={() => { onClearAll(); setConfirmClear(false); }}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="text-xs text-text-muted hover:text-text cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs text-text-muted hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
            )
          )}
        </div>

        {pairEntries.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">
            No custom pairs added yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left text-text-muted font-medium">Card A</th>
                  <th className="py-2 text-left text-text-muted font-medium">Card B</th>
                  <th className="py-2 text-left text-text-muted font-medium">Power</th>
                  <th className="py-2 text-left text-text-muted font-medium">Win Rate</th>
                  <th className="py-2 text-left text-text-muted font-medium">Count</th>
                  <th className="py-2 text-left text-text-muted font-medium">LogMult</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {pairEntries.map(([key, data]) => {
                  const [a, b] = key.split("|||");
                  return (
                    <tr key={key} className="border-b border-border/50 hover:bg-surface-light/50 transition-colors">
                      <td className="py-2">{a}</td>
                      <td className="py-2">{b}</td>
                      <td className="py-2 font-mono">{data.p?.toFixed(2) ?? "—"}</td>
                      <td className="py-2 font-mono">{data.w?.toFixed(2) ?? "—"}</td>
                      <td className="py-2 font-mono">{data.c ?? "—"}</td>
                      <td className="py-2 font-mono">{data.l?.toFixed(4) ?? "—"}</td>
                      <td className="py-2">
                        <button
                          onClick={() => onRemovePair(key)}
                          className="text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
