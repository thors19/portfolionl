"use client";

import { use } from "react";
import BlogEditor from "@/components/admin/BlogEditor";

export default function BewerkArtikelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BlogEditor articleId={id} />;
}
