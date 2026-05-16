"use client";

import { useState } from "react";
import { X, ClipboardPaste } from "lucide-react";
import { marked } from "marked";

interface Props {
  onClose: () => void;
  onInsert: (html: string) => void;
}

export default function PasteMarkdownModal({ onClose, onInsert }: Props) {
  const [text, setText] = useState("");

  async function handleInsert() {
    if (!text.trim()) return;
    const html = await marked(text);
    onInsert(html);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-800">Plak markdown inhoud</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-500">
            Plak hier je gegenereerde markdown-tekst. Koppen, lijsten, vet en cursief worden automatisch omgezet.
          </p>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="## Inleiding&#10;&#10;Plak hier je markdown tekst..."
            rows={16}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="px-5 pb-5 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            Annuleren
          </button>
          <button onClick={handleInsert} disabled={!text.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <ClipboardPaste className="w-4 h-4" />
            Laden in editor
          </button>
        </div>
      </div>
    </div>
  );
}
