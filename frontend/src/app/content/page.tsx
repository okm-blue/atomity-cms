"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { cmsFetch, ContentPost, ContentType, formatDate, PageResult } from "@/lib/cms";

export default function ContentListPage() {
  const [types, setTypes] = useState<ContentType[]>([]);
  const [items, setItems] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    cmsFetch<ContentType[]>("api/v1/content-types").then(setTypes).catch((reason) => setError(reason.message));
  }, []);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ size: "100" });
    if (type) query.set("type", type);
    if (status) query.set("status", status);
    if (search.trim()) query.set("search", search.trim());
    cmsFetch<PageResult<ContentPost>>(`api/v1/posts?${query}`)
      .then((result) => {
        if (active) {
          setItems(result.content);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load content");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [type, status, search]);

  return (
    <AppShell>
      <div className="page-heading">
        <div><span className="eyebrow">YOUR WORKSPACE</span><h1>Content</h1><p>Manage the stories and resources that power your product.</p></div>
        <Link href="/content/new" className="button primary"><span className="button-plus">＋</span> New content</Link>
      </div>
      <section className="stat-row">
        <div className="stat-card"><span className="stat-icon">▤</span><div><span className="stat-label">Total entries</span><strong>{items.length}</strong></div></div>
        <div className="stat-card"><span className="stat-icon published-icon">◉</span><div><span className="stat-label">Published</span><strong>{items.filter((item) => item.status === "PUBLISHED").length}</strong></div></div>
        <div className="stat-card"><span className="stat-icon draft-icon">◷</span><div><span className="stat-label">Drafts</span><strong>{items.filter((item) => item.status === "DRAFT").length}</strong></div></div>
        <div className="stat-note"><span className="sparkle">✳</span><span>Your content is always yours.<br /><b>Publish when you’re ready.</b></span></div>
      </section>
      <section className="content-card">
        <div className="list-heading"><div><h2>All content</h2><span>{items.length} {items.length === 1 ? "entry" : "entries"}</span></div></div>
        <div className="filters">
          <div className="search-field"><span>⌕</span><input aria-label="Search content" placeholder="Search by title…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <select aria-label="Filter by type" value={type} onChange={(event) => setType(event.target.value)}><option value="">All types</option>{types.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select>
          <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select>
        </div>
        {error && <div className="alert error-alert">{error}</div>}
        <div className="table-wrap">
          <table className="content-table">
            <thead><tr><th>TITLE</th><th>TYPE</th><th>STATUS</th><th>LAST UPDATED</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="table-empty">Loading content…</td></tr> :
                items.length ? items.map((item) => (
                  <tr key={item.id}>
                    <td><Link className="table-title" href={`/content/${item.id}`}>{item.title || <span className="untitled">Untitled draft</span>}</Link><span className="table-slug">{item.slug ? `/${item.slug}` : "No slug yet"}</span></td>
                    <td><span className={`type-dot type-${item.type}`} />{types.find((entry) => entry.key === item.type)?.label ?? item.type}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td className="date-cell">{formatDate(item.updatedAt)}</td>
                    <td><Link className="row-arrow" href={`/content/${item.id}`} aria-label={`Edit ${item.title || "draft"}`}>↗</Link></td>
                  </tr>
                )) : <tr><td colSpan={5} className="table-empty"><div className="empty-icon">✳</div><strong>No content found</strong><span>Try changing the filters or create your first entry.</span><Link href="/content/new" className="button secondary">Create content</Link></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <p className="page-footnote"><span>i</span> Only published content is available through the public API.</p>
    </AppShell>
  );
}
