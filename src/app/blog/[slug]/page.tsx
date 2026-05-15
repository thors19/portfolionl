import { getPostBySlug, getRelatedPosts, getAllPosts } from "@/lib/blog";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, ArrowLeft, Tag } from "lucide-react";
import type { Metadata } from "next";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Niet gevonden" };
  return {
    title: `${post.title} – PortfolioNL Blog`,
    description: post.summary,
    openGraph: { title: post.title, description: post.summary, type: "article" },
  };
}

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

const CATEGORY_COLORS: Record<string, string> = {
  ETFs: "bg-blue-100 text-blue-700", Aandelen: "bg-green-100 text-green-700",
  Crypto: "bg-purple-100 text-purple-700", Edelmetalen: "bg-amber-100 text-amber-700",
  Strategie: "bg-teal-100 text-teal-700", Fiscaal: "bg-red-100 text-red-700",
};

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, post.category);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 mb-6">
        <ArrowLeft className="w-4 h-4" />Terug naar blog
      </Link>

      {/* Article header */}
      <article>
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLORS[post.category] ?? "bg-slate-100 text-slate-600"}`}>
              {post.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />{post.leestijd} min leestijd
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-4">{post.title}</h1>
          <p className="text-lg text-slate-500 mb-5">{post.summary}</p>
          <div className="flex items-center gap-4 text-sm text-slate-400 pb-6 border-b border-slate-100">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.date).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span>door {post.author}</span>
          </div>
        </header>

        {/* Article content */}
        <div
          className="prose prose-slate max-w-none
            prose-headings:font-semibold prose-headings:text-slate-800
            prose-p:text-slate-600 prose-p:leading-relaxed
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-slate-800
            prose-ul:text-slate-600 prose-ol:text-slate-600
            prose-li:my-1
            prose-blockquote:border-blue-400 prose-blockquote:bg-blue-50 prose-blockquote:text-blue-800 prose-blockquote:not-italic prose-blockquote:rounded-r-lg prose-blockquote:py-1
            prose-code:bg-slate-100 prose-code:text-slate-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-slate-800 prose-pre:text-slate-100"
          dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-8 pt-6 border-t border-slate-100">
            <span className="text-sm text-slate-400">Tags:</span>
            {post.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                <Tag className="w-3 h-3" />{tag}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* Disclaimer */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Disclaimer:</strong> Dit artikel is informatief en geen financieel advies. Beleggen brengt risico&apos;s met zich mee.
        Raadpleeg altijd een financieel adviseur voor persoonlijk advies.
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Gerelateerde artikelen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {related.map((r) => (
              <Link key={r.slug} href={`/blog/${r.slug}`}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow group">
                <h3 className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors mb-1 text-sm leading-snug">
                  {r.title}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{r.leestijd} min
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
