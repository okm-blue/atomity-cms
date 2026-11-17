"use client";

/* eslint-disable @next/next/no-img-element -- Media URLs come from the runtime-configured CMS backend. */

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { cmsFetch, MediaAsset } from "@/lib/cms";

export default function MediaPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    cmsFetch<MediaAsset[]>("api/v1/media")
      .then((result) => {
        if (active) {
          setAssets(result);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load media");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.append("file", file);
      const asset = await cmsFetch<MediaAsset>("api/v1/media", { method: "POST", body: data });
      setAssets((current) => [asset, ...current]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload image");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <AppShell>
      <div className="page-heading">
        <div><span className="eyebrow">YOUR ASSETS</span><h1>Media library</h1><p>Keep images close to your content. Nothing is sent to external storage.</p></div>
        <button className="button primary" onClick={() => inputRef.current?.click()} disabled={uploading}><span className="button-plus">＋</span>{uploading ? "Uploading…" : "Upload image"}</button>
        <input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={upload} />
      </div>
      {error && <div role="alert" className="alert error-alert">{error}</div>}
      <section className="content-card media-library-card">
        <div className="list-heading"><div><h2>All images</h2><span>{assets.length} {assets.length === 1 ? "image" : "images"}</span></div><span className="media-limit">PNG, JPEG, GIF, WebP · 10 MB max</span></div>
        {loading ? <div className="media-empty">Loading images…</div> : assets.length ? (
          <div className="media-grid">{assets.map((asset) => (
            <article className="media-item" key={asset.id}>
              <div className="media-preview"><img src={asset.url} alt={asset.originalName} /></div>
              <div className="media-info"><strong title={asset.originalName}>{asset.originalName}</strong><span>{(asset.sizeBytes / 1024).toFixed(0)} KB · {new Date(asset.createdAt).toLocaleDateString()}</span></div>
              <button className="copy-url" onClick={() => void navigator.clipboard.writeText(asset.url).then(() => setError("Image URL copied to clipboard.")).catch(() => setError("Could not copy image URL."))}>Copy URL</button>
            </article>
          ))}</div>
        ) : <div className="media-empty"><span className="empty-icon">▧</span><strong>Your library is empty</strong><span>Upload an image to use it in your content.</span><button className="button secondary" onClick={() => inputRef.current?.click()}>Upload your first image</button></div>}
      </section>
    </AppShell>
  );
}
