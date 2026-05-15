import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import { BlogPost } from "./types";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));

  return files
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf-8");
      const { data } = matter(raw);
      return {
        slug,
        title: data.title ?? slug,
        date: data.date ?? "",
        category: data.category ?? "Overig",
        tags: data.tags ?? [],
        summary: data.summary ?? "",
        leestijd: data.leestijd ?? Math.ceil(raw.split(/\s+/).length / 200),
        author: data.author ?? "PortfolioNL",
      } as BlogPost;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filepath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filepath)) return null;
  const raw = fs.readFileSync(filepath, "utf-8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? "",
    category: data.category ?? "Overig",
    tags: data.tags ?? [],
    summary: data.summary ?? "",
    leestijd: data.leestijd ?? Math.ceil(content.split(/\s+/).length / 200),
    author: data.author ?? "PortfolioNL",
    content: marked(content) as string,
  };
}

export function getRelatedPosts(slug: string, category: string, limit = 3): BlogPost[] {
  return getAllPosts()
    .filter((p) => p.slug !== slug && p.category === category)
    .slice(0, limit);
}
