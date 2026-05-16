"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye, EyeOff, Globe, FileText } from "lucide-react";
import { BlogArticle, getAllArticles, deleteArticle, togglePublish, seedIfEmpty } from "@/lib/blogStore";

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID;

export default function AdminBlogPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId || (ADMIN_USER_ID && userId !== ADMIN_USER_ID)) {
      router.replace("/");
      return;
    }
    seedIfEmpty().then(() => setArticles(getAllArticles().sort((a, b) => b.datum.localeCompare(a.datum))));
  }, [isLoaded, userId, router]);

  function refresh() {
    setArticles(getAllArticles().sort((a, b) => b.datum.localeCompare(a.datum)));
  }

  function handleDelete(id: string, titel: string) {
    if (!confirm(`Artikel "${titel}" verwijderen?`)) return;
    deleteArticle(id);
    refresh();
  }

  function handleToggle(id: string) {
    togglePublish(id);
    refresh();
  }

  const filtered = articles.filter((a) =>
    filter === "all" ? true : filter === "published" ? a.gepubliceerd : !a.gepubliceerd
  );

  if (!isLoaded) return null;

  return (
    <div className="container mx-auto px-4 max-w-5xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Blog beheren</h1>
          <p className="text-slate-500 text-sm mt-1">{articles.length} artikelen · {articles.filter((a) => a.gepubliceerd).length} gepubliceerd</p>
        </div>
        <Link href="/admin/blog/nieuw"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Nieuw artikel
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["all", "published", "draft"] as const).map((f) => {
          const labels = { all: "Alle", published: "Gepubliceerd", draft: "Concept" };
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                filter === f ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Articles list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>Geen artikelen gevonden.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-slate-500 font-medium">Artikel</th>
                <th className="px-4 py-3 text-slate-500 font-medium">Categorie</th>
                <th className="px-4 py-3 text-slate-500 font-medium">Datum</th>
                <th className="px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="px-4 py-3 text-slate-500 font-medium text-right">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((art) => (
                <tr key={art.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 leading-snug">{art.titel}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{art.leestijd} min · {art.samenvatting.slice(0, 60)}…</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{art.categorie}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(art.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      art.gepubliceerd ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {art.gepubliceerd ? "Gepubliceerd" : "Concept"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/blog/${art.id}/bewerken`}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Bewerken">
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button onClick={() => handleToggle(art.id)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        title={art.gepubliceerd ? "Depubliceren" : "Publiceren"}>
                        {art.gepubliceerd ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      </button>
                      <Link href={`/blog/${art.slug}`} target="_blank"
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" title="Bekijken">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button onClick={() => handleDelete(art.id, art.titel)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Verwijderen">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
