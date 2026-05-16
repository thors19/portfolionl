"use client";

import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Quote, Link2, Sparkles, Save, Globe, ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  BlogArticle, saveArticle, generateSlug, calculateLeestijd, getArticleById,
} from "@/lib/blogStore";
import AIWriteModal from "./AIWriteModal";
import { v4 as uuidv4 } from "uuid";

const CATEGORIES = ["ETFs", "Aandelen", "Crypto", "Edelmetalen", "Strategie", "Fiscaal", "Overig"];

interface Props {
  articleId?: string; // undefined = new article
}

export default function BlogEditor({ articleId }: Props) {
  const router = useRouter();
  const isNew = !articleId;

  const [titel, setTitel] = useState("");
  const [samenvatting, setSamenvatting] = useState("");
  const [categorie, setCategorie] = useState("Strategie");
  const [tags, setTags] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [gepubliceerd, setGepubliceerd] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [wordCount, setWordCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Begin hier met schrijven of gebruik de AI-assistent…" }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
    },
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none min-h-[400px] p-4 focus:outline-none",
      },
    },
  });

  // Load existing article
  useEffect(() => {
    if (!articleId) return;
    const art = getArticleById(articleId);
    if (!art) { router.push("/admin/blog"); return; }
    setTitel(art.titel);
    setSamenvatting(art.samenvatting);
    setCategorie(art.categorie);
    setTags(art.tags.join(", "));
    setDatum(art.datum);
    setGepubliceerd(art.gepubliceerd);
    editor?.commands.setContent(art.inhoud);
  }, [articleId, editor, router]);

  const buildArticle = useCallback((pub: boolean): BlogArticle => {
    const html = editor?.getHTML() ?? "";
    return {
      id: articleId ?? uuidv4(),
      slug: isNew ? generateSlug(titel) : (getArticleById(articleId!)?.slug ?? generateSlug(titel)),
      titel,
      samenvatting,
      inhoud: html,
      categorie,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      datum,
      gepubliceerd: pub,
      leestijd: calculateLeestijd(html),
      auteur: "PortfolioNL",
    };
  }, [editor, articleId, isNew, titel, samenvatting, categorie, tags, datum]);

  function save(pub: boolean) {
    if (!titel.trim()) { alert("Vul een titel in."); return; }
    setSaving(true);
    saveArticle(buildArticle(pub));
    setGepubliceerd(pub);
    setSavedMsg(pub ? "Gepubliceerd ✓" : "Concept opgeslagen ✓");
    setTimeout(() => setSavedMsg(""), 3000);
    setSaving(false);
  }

  function insertAI(html: string) {
    editor?.commands.setContent(html);
    setWordCount(editor?.getText().trim().split(/\s+/).filter(Boolean).length ?? 0);
  }

  const leestijd = Math.max(1, Math.ceil(wordCount / 200));

  if (!editor) return null;

  return (
    <>
      {showAI && <AIWriteModal onClose={() => setShowAI(false)} onInsert={insertAI} />}

      <div className="min-h-screen bg-slate-50">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="container mx-auto px-4 max-w-5xl h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/admin/blog")}
                className="text-slate-400 hover:text-slate-600">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-slate-600">
                {isNew ? "Nieuw artikel" : "Artikel bewerken"}
              </span>
              {savedMsg && (
                <span className="text-sm text-green-600 font-medium">{savedMsg}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{wordCount} woorden · ~{leestijd} min</span>
              <button
                onClick={() => setShowAI(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium hover:bg-purple-100"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Schrijf met AI
              </button>
              <button
                onClick={() => save(false)}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                <Save className="w-3.5 h-3.5" />
                Concept
              </button>
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Globe className="w-3.5 h-3.5" />
                {gepubliceerd ? "Bijwerken" : "Publiceren"}
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-5xl py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Editor */}
            <div className="lg:col-span-2 space-y-4">
              {/* Title */}
              <input
                type="text"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="Artikel titel…"
                className="w-full text-2xl font-bold border-0 border-b border-slate-200 pb-3 focus:outline-none focus:border-blue-400 bg-transparent placeholder-slate-300"
              />

              {/* Summary */}
              <textarea
                value={samenvatting}
                onChange={(e) => setSamenvatting(e.target.value)}
                placeholder="Korte samenvatting voor de blogpagina…"
                rows={2}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />

              {/* TipTap toolbar */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex flex-wrap gap-0.5 p-2 border-b border-slate-100 bg-slate-50">
                  {[
                    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), title: "Vet" },
                    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), title: "Cursief" },
                    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), title: "H2" },
                    { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }), title: "H3" },
                    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), title: "Lijst" },
                    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), title: "Genummerd" },
                    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), title: "Citaat" },
                    { icon: Link2, action: () => {
                      const url = window.prompt("URL:");
                      if (url) editor.chain().focus().setLink({ href: url }).run();
                    }, active: editor.isActive("link"), title: "Link" },
                  ].map(({ icon: Icon, action, active, title }) => (
                    <button key={title} onClick={action} title={title}
                      className={`p-1.5 rounded text-sm transition-colors ${active ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-200"}`}>
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Instellingen</h3>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Categorie</label>
                  <select value={categorie} onChange={(e) => setCategorie(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tags</label>
                  <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                    placeholder="etf, dividend, beleggen"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <p className="text-xs text-slate-400 mt-1">Komma&apos;s als scheidingsteken</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Publicatiedatum</label>
                  <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Status</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gepubliceerd ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {gepubliceerd ? "Gepubliceerd" : "Concept"}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-1">
                <p><strong>{wordCount}</strong> woorden</p>
                <p>~<strong>{leestijd}</strong> minuten leestijd</p>
                <p>Categorie: <strong>{categorie}</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
