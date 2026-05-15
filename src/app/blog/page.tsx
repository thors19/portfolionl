import { getAllPosts } from "@/lib/blog";
import Link from "next/link";
import { Calendar, Clock, Tag } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  ETFs:         "bg-blue-100 text-blue-700",
  Aandelen:     "bg-green-100 text-green-700",
  Crypto:       "bg-purple-100 text-purple-700",
  Edelmetalen:  "bg-amber-100 text-amber-700",
  Strategie:    "bg-teal-100 text-teal-700",
  Fiscaal:      "bg-red-100 text-red-700",
  Overig:       "bg-slate-100 text-slate-600",
};

export const metadata = {
  title: "Blog – PortfolioNL",
  description: "Artikelen over beleggen in ETFs, aandelen, crypto en edelmetalen voor Nederlandse beleggers",
};

export default function BlogPage() {
  const posts = getAllPosts();
  const categories = [...new Set(posts.map((p) => p.category))];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Blog</h1>
        <p className="text-slate-500 mt-1">Artikelen over beleggen voor Nederlandse beleggers</p>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <span key={cat} className={`text-xs px-3 py-1.5 rounded-full font-medium ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Overig}`}>
            {cat}
          </span>
        ))}
      </div>

      {/* Articles grid */}
      {posts.length === 0 ? (
        <p className="text-slate-400 text-center py-12">Nog geen artikelen gepubliceerd.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.Overig}`}>
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />{post.leestijd} min
                  </span>
                </div>
                <h2 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors leading-snug mb-2">
                  {post.title}
                </h2>
                <p className="text-sm text-slate-500 line-clamp-3 mb-4">{post.summary}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="w-3 h-3" />
                  {new Date(post.date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                </div>
                {post.tags.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                        <Tag className="w-2.5 h-2.5" />{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
