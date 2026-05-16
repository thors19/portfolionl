"use client";

import { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { marked } from "marked";

interface Props {
  onClose: () => void;
  onInsert: (html: string) => void;
}

export default function AIWriteModal({ onClose, onInsert }: Props) {
  const [onderwerp, setOnderwerp] = useState("");
  const [toon, setToon] = useState("informatief");
  const [doelgroep, setDoelgroep] = useState("");
  const [lengte, setLengte] = useState("middel");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!onderwerp.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onderwerp, toon, doelgroep, lengte }),
      });
      const data = await res.json() as { markdown?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Generatie mislukt");
      const html = await marked(data.markdown ?? "");
      onInsert(html);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Er is iets misgegaan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-slate-800">Schrijf met AI</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Onderwerp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={onderwerp}
              onChange={(e) => setOnderwerp(e.target.value)}
              placeholder="bijv. Belastingoptimalisatie voor DEGIRO beleggers in 2025"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Toon</label>
              <select
                value={toon}
                onChange={(e) => setToon(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="informatief">Informatief</option>
                <option value="toegankelijk">Toegankelijk</option>
                <option value="diepgaand">Diepgaand</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lengte</label>
              <select
                value={lengte}
                onChange={(e) => setLengte(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="kort">Kort (~700 woorden)</option>
                <option value="middel">Middel (~1200 woorden)</option>
                <option value="lang">Lang (~2000 woorden)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Doelgroep <span className="text-slate-400 text-xs">(optioneel)</span>
            </label>
            <input
              type="text"
              value={doelgroep}
              onChange={(e) => setDoelgroep(e.target.value)}
              placeholder="bijv. beginners die net starten met beleggen via DEGIRO"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Annuleren
          </button>
          <button
            onClick={generate}
            disabled={loading || !onderwerp.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Genereren...</>
            ) : (
              <><Sparkles className="w-4 h-4" />Genereer artikel</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
