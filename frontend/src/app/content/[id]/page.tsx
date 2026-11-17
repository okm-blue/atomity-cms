"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RichTextEditor } from "@/components/RichTextEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { cmsFetch, CmsError, ContentPost, ContentType, FieldDefinition, formatDate, slugify } from "@/lib/cms";

export default function ContentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<ContentPost | null>(null);
  const [type, setType] = useState<ContentType | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState<Record<string, unknown>>({ type: "doc", content: [] });
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [loadedId, setLoadedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      cmsFetch<ContentPost>(`api/v1/posts/${id}`),
      cmsFetch<ContentType[]>("api/v1/content-types"),
    ]).then(([entry, types]) => {
      if (!active) return;
      setPost(entry);
      setType(types.find((item) => item.key === entry.type) ?? null);
      setTitle(entry.title);
      setSlug(entry.slug);
      setSlugTouched(!!entry.slug && entry.slug !== slugify(entry.title));
      setExcerpt(entry.excerpt);
      setBody(entry.body);
      setFields(entry.fields);
      setDirty(false);
      setError("");
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Could not load content");
    }).finally(() => {
      if (active) setLoadedId(id);
    });
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.dispatchEvent(new CustomEvent("cms-unsaved-change", { detail: dirty }));
    window.addEventListener("beforeunload", guard);
    return () => {
      window.removeEventListener("beforeunload", guard);
      window.dispatchEvent(new CustomEvent("cms-unsaved-change", { detail: false }));
    };
  }, [dirty]);

  function changeField(field: FieldDefinition, value: unknown) {
    setFields((current) => ({ ...current, [field.key]: value }));
    setDirty(true);
  }

  async function save(): Promise<ContentPost | null> {
    if (!post) return null;
    setSaving(true);
    setError("");
    setDetails([]);
    try {
      const updated = await cmsFetch<ContentPost>(`api/v1/posts/${post.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: post.type, title, slug, excerpt, body, fields, version: post.version }),
      });
      setPost(updated);
      setSlug(updated.slug);
      setDirty(false);
      return updated;
    } catch (reason) {
      if (reason instanceof CmsError) {
        setError(reason.message);
        setDetails(reason.details);
        if (reason.status === 409) setError(`${reason.message} Reload to see the latest saved version.`);
      } else {
        setError(reason instanceof Error ? reason.message : "Could not save draft");
      }
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    const saved = await save();
    if (!saved) return;
    setSaving(true);
    setError("");
    setDetails([]);
    try {
      const published = await cmsFetch<ContentPost>(`api/v1/posts/${saved.id}/publish`, { method: "POST" });
      setPost(published);
      setDirty(false);
    } catch (reason) {
      if (reason instanceof CmsError) {
        setError(reason.message);
        setDetails(reason.details);
      } else {
        setError(reason instanceof Error ? reason.message : "Could not publish content");
      }
    } finally {
      setSaving(false);
    }
  }

  async function unpublish() {
    if (!post) return;
    const saved = dirty ? await save() : post;
    if (!saved) return;
    setSaving(true);
    setError("");
    try {
      const result = await cmsFetch<ContentPost>(`api/v1/posts/${saved.id}/unpublish`, { method: "POST" });
      setPost(result);
      setDirty(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not unpublish content");
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!post || !window.confirm(dirty
      ? "Archive this content and discard your unsaved changes?"
      : "Archive this content? It will no longer be publicly available.")) return;
    setSaving(true);
    setError("");
    try {
      await cmsFetch<ContentPost>(`api/v1/posts/${post.id}/archive`, { method: "POST" });
      router.replace("/content");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not archive content");
      setSaving(false);
    }
  }

  if (loadedId !== id) return <AppShell><div className="loading-panel">Loading editor…</div></AppShell>;
  if (!post || post.id !== id) return <AppShell><div className="alert error-alert">{error || "Content was not found."} <Link href="/content">Return to content</Link></div></AppShell>;
  const archived = post.status === "ARCHIVED";

  return (
    <AppShell>
      <div className="editor-topline">
        <Link className="back-link" href="/content">← All content</Link>
        <div className="editor-actions">
          <StatusBadge status={post.status} />
          <button className="button secondary" onClick={() => void save()} disabled={saving || archived}>{saving ? "Saving…" : post.status === "DRAFT" ? "Save draft" : "Save changes"}</button>
          {post.status === "PUBLISHED" ?
            <button className="button primary" onClick={() => void unpublish()} disabled={saving}>Unpublish</button> :
            <button className="button primary" onClick={() => void publish()} disabled={saving || archived}>{saving ? "Working…" : "Publish"}</button>}
          <div className="editor-menu">
            <button className="icon-button archive-button" aria-label="More actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} disabled={saving || archived}>•••</button>
            {menuOpen && <div className="menu-popover"><button onClick={() => { setMenuOpen(false); void archive(); }}>Archive entry</button></div>}
          </div>
        </div>
      </div>
      {error && <div role="alert" className="alert error-alert">{error}{details.length > 0 && <ul>{details.map((item) => <li key={item}>{item}</li>)}</ul>}</div>}
      {archived && <div className="alert info-alert">This entry is archived and no longer appears in the public API.</div>}
      <div className="editor-layout">
        <section className="editor-main">
          <div className="editor-card">
            <div className="editor-type-label"><span className={`type-dot type-${post.type}`} />{type?.label ?? post.type} <span>·</span> {post.status === "DRAFT" ? "New entry" : "Content entry"}</div>
            <label className="title-label" htmlFor="content-title">Title</label>
            <textarea id="content-title" className="title-input" placeholder="Give your content a clear title…" value={title} rows={2} onChange={(event) => {
              const nextTitle = event.target.value;
              setTitle(nextTitle);
              if (!slugTouched) setSlug(slugify(nextTitle));
              setDirty(true);
            }} disabled={archived} />
            <div className="editor-meta-row"><span>Content body</span><span className="required-note">Rich text · Images supported</span></div>
            <RichTextEditor value={body} onChange={(value) => { setBody(value); setDirty(true); }} />
            <label className="field-label excerpt-label">Excerpt <span>OPTIONAL</span></label>
            <textarea className="text-area excerpt-area" rows={3} placeholder="A short summary for listings and previews…" value={excerpt} onChange={(event) => { setExcerpt(event.target.value); setDirty(true); }} disabled={archived} />
          </div>
          <div className="metadata-card"><span className="eyebrow">ENTRY DETAILS</span><span>Created {formatDate(post.createdAt)} · Updated {formatDate(post.updatedAt)}</span></div>
        </section>
        <aside className="editor-side">
          <section className="side-card">
            <div className="side-card-heading"><span className="side-card-icon">⌘</span><div><h2>Publishing</h2><p>Control where this entry appears.</p></div></div>
            <div className="status-preview"><span className={`status-dot ${post.status.toLowerCase()}`} /><div><strong>{post.status === "PUBLISHED" ? "Live and public" : post.status === "ARCHIVED" ? "Archived" : "Draft"}</strong><span>{post.status === "PUBLISHED" ? "Available through the public API" : "Only visible to you"}</span></div></div>
            {post.publishedAt && <p className="published-date">Published {formatDate(post.publishedAt)}</p>}
            <div className="side-divider" />
            <label className="field-label" htmlFor="slug">URL slug <span>UNIQUE PER TYPE</span></label>
            <div className="slug-input-wrap"><span>/</span><input id="slug" value={slug} onChange={(event) => { setSlug(event.target.value); setSlugTouched(true); setDirty(true); }} disabled={archived} placeholder="your-content-slug" /></div>
            <p className="field-hint">Only lowercase letters, numbers, and hyphens.</p>
            <div className="side-divider" />
            <p className="field-label">Destination <span>METADATA ONLY</span></p>
            <div className="destination-value"><span>↗</span>{type?.destination ?? post.type}</div>
          </section>
          {type?.fields.length ? <section className="side-card details-card">
            <div className="side-card-heading"><span className="side-card-icon">☷</span><div><h2>{type.label} details</h2><p>Guided fields for this content type.</p></div></div>
            <div className="detail-fields">
              {type.fields.map((field) => <FieldInput key={field.key} field={field} value={fields[field.key]} disabled={archived} onChange={(value) => changeField(field, value)} />)}
            </div>
          </section> : null}
          <div className="editor-help"><span>✦</span><p><strong>Ready to go live?</strong><br />Publishing makes this entry available to any website using your public API.</p></div>
        </aside>
      </div>
    </AppShell>
  );
}

function FieldInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldDefinition;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const id = `field-${field.key}`;
  if (field.type === "boolean") {
    return <label className="toggle-field" htmlFor={id}><span><b>{field.label}</b><small>{field.required ? "Required to publish" : "Optional"}</small></span><input id={id} type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} disabled={disabled} /></label>;
  }
  if (field.type === "select") {
    return <label className="field-label" htmlFor={id}>{field.label}{field.required && <span>REQUIRED</span>}<select id={id} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} disabled={disabled}><option value="">Choose…</option>{field.options.map((option) => <option value={option} key={option}>{option.replace("-", " ")}</option>)}</select></label>;
  }
  return <label className="field-label" htmlFor={id}>{field.label}{field.required && <span>REQUIRED</span>}<input id={id} type={field.type} value={value == null ? "" : String(value)} onChange={(event) => onChange(field.type === "number" && event.target.value ? Number(event.target.value) : event.target.value)} disabled={disabled} /></label>;
}
