"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { cmsFetch, ContentType, emptyDocument } from "@/lib/cms";

const typeMarks: Record<string, string> = { news: "✳", career: "↗", docs: "▤", kb: "?", };

export default function NewContentPage() {
  const router = useRouter();
  const [types, setTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cmsFetch<ContentType[]>("api/v1/content-types").then(setTypes).catch((reason) => setError(reason.message));
  }, []);

  async function create(type: ContentType) {
    setLoading(type.key);
    setError("");
    try {
      const post = await cmsFetch<{ id: string }>("api/v1/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: type.key, body: emptyDocument(), fields: {} }),
      });
      router.push(`/content/${post.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create draft");
      setLoading("");
    }
  }

  return (
    <AppShell>
      <div className="breadcrumb-back"><button onClick={() => router.back()}>← Back to content</button></div>
      <div className="type-select-heading"><span className="eyebrow">NEW ENTRY</span><h1>What are you creating?</h1><p>Choose a content type to get guided fields and publishing checks tailored to your needs.</p></div>
      {error && <div className="alert error-alert">{error}</div>}
      <div className="type-grid">
        {types.map((type) => (
          <button className="type-card" key={type.key} onClick={() => create(type)} disabled={!!loading}>
            <span className={`type-card-icon type-icon-${type.key}`}>{typeMarks[type.key]}</span>
            <span className="type-card-content"><strong>{type.label}</strong><span>{type.description}</span></span>
            <span className="type-card-arrow">{loading === type.key ? "…" : "↗"}</span>
            <span className="type-card-fields">{type.fields.length ? `${type.fields.length} guided fields` : "Standard content fields"}</span>
          </button>
        ))}
      </div>
      <div className="type-tip"><span>✦</span><p><strong>Not sure yet?</strong> You can always save as a draft and add details later.</p></div>
    </AppShell>
  );
}
