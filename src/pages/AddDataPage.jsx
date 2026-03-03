import { useState, useRef } from "react";
import { Plus, Upload, Trash2, FileText, Code } from "lucide-react";

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  return (bytes / 1024).toFixed(1) + " KB";
}

export default function AddDataPage({
  customPairs,
  onAddPair,
  onAddPairsBulk,
  onRemovePair,
  onClearAll,
}) {
  const [tab, setTab] = useState("manual");
  const [cardA, setCardA] = useState("");
  const [cardB, setCardB] = useState("");
  const [power, setPower] = useState("");
  const [winRate, setWinRate] = useState("");
  const [count, setCount] = useState("");
  const [logMult, setLogMult] = useState("");
  const [manualError, setManualError] = useState("");

  const [bulkFormat, setBulkFormat] = useState("csv");
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");
  const fileRef = useRef(null);

  const [confirmClear, setConfirmClear] = useState(false);

  const pairEntries = Object.entries(customPairs);
  const storageSize = formatBytes(
    new Blob([JSON.stringify(customPairs)]).size
  );

  function handleManualSubmit(e) {
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

    const stats = { p };
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

  function parseCsv(text) {
    const lines = text.split("\n").filter((l) => l.trim());
    const pairs = {};
    const startIdx =
      lines[0] && /card/i.test(lines[0]) ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(",").map((s) => s.trim());
      if (cols.length < 3) continue;
      const [a, b] = [cols[0], cols[1]].sort();
      const key = `${a}|||${b}`;
      const stats = { p: parseFloat(cols[2]) || 0 };
      if (cols[3]) stats.w = parseFloat(cols[3]) || 0;
      if (cols[4]) stats.c = parseInt(cols[4], 10) || 0;
      if (cols[5]) stats.l = parseFloat(cols[5]) || 0;
      pairs[key] = stats;
    }
    return pairs;
  }

  function parseJson(text) {
    const obj = JSON.parse(text);
    const pairs = {};
    for (const [key, val] of Object.entries(obj)) {
      if (!key.includes("|||")) continue;
      pairs[key] = {
        p: val.p ?? val.PowerRank ?? 0,
        w: val.w ?? val.Winrate ?? 0,
        c: val.c ?? val.ConfidentChallenges ?? 0,
        l: val.l ?? val.LogMultiplier ?? 0,
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
      setBulkError("Parse error: " + err.message);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBulkText(ev.target.result);
      if (file.name.endsWith(".json")) setBulkFormat("json");
      else setBulkFormat("csv");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Add Custom Pair Data</h1>

      {/* Tabs */}
      <div className="flex gap-2">
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

      {/* Manual Entry */}
      {tab === "manual" && (
        <form
          onSubmit={handleManualSubmit}
          className="glass rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">
                Card A
              </label>
              <input
                type="text"
                value={cardA}
                onChange={(e) => setCardA(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                placeholder="Sol Ring"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">
                Card B
              </label>
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
                type="number"
                step="any"
                value={power}
                onChange={(e) => setPower(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                placeholder="0-10"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">
                Win Rate
              </label>
              <input
                type="number"
                step="any"
                value={winRate}
                onChange={(e) => setWinRate(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">
                Count
              </label>
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">
                Log Multiplier
              </label>
              <input
                type="number"
                step="any"
                value={logMult}
                onChange={(e) => setLogMult(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
          {manualError && (
            <p className="text-sm text-red-400">{manualError}</p>
          )}
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
          {bulkSuccess && (
            <p className="text-sm text-green-400">{bulkSuccess}</p>
          )}

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
                  onClick={() => {
                    onClearAll();
                    setConfirmClear(false);
                  }}
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
                  <th className="py-2 text-left text-text-muted font-medium">
                    Card A
                  </th>
                  <th className="py-2 text-left text-text-muted font-medium">
                    Card B
                  </th>
                  <th className="py-2 text-left text-text-muted font-medium">
                    Power
                  </th>
                  <th className="py-2 text-left text-text-muted font-medium">
                    Win Rate
                  </th>
                  <th className="py-2 text-left text-text-muted font-medium">
                    Count
                  </th>
                  <th className="py-2 text-left text-text-muted font-medium">
                    LogMult
                  </th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {pairEntries.map(([key, data]) => {
                  const [a, b] = key.split("|||");
                  return (
                    <tr
                      key={key}
                      className="border-b border-border/50 hover:bg-surface-light/50 transition-colors"
                    >
                      <td className="py-2">{a}</td>
                      <td className="py-2">{b}</td>
                      <td className="py-2 font-mono">
                        {data.p?.toFixed(2) ?? "—"}
                      </td>
                      <td className="py-2 font-mono">
                        {data.w?.toFixed(2) ?? "—"}
                      </td>
                      <td className="py-2 font-mono">{data.c ?? "—"}</td>
                      <td className="py-2 font-mono">
                        {data.l?.toFixed(4) ?? "—"}
                      </td>
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
