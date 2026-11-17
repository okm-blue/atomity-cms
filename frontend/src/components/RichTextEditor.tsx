"use client";

/* eslint-disable @next/next/no-img-element -- Media URLs come from the runtime-configured CMS backend. */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useEffect, useRef, useState } from "react";
import { cmsFetch, MediaAsset } from "@/lib/cms";

export function RichTextEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Image.configure({ inline: false, allowBase64: false })],
    content: value,
    editorProps: { attributes: { class: "tiptap-content", "aria-label": "Article body" } },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as Record<string, unknown>),
  });

  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  async function openPicker() {
    setPickerOpen(true);
    setError("");
    try {
      setMedia(await cmsFetch<MediaAsset[]>("api/v1/media"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load media");
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const asset = await cmsFetch<MediaAsset>("api/v1/media", { method: "POST", body: form });
      editor?.chain().focus().setImage({ src: asset.url, alt: asset.originalName }).run();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload image");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (!editor) return <div className="editor-loading">Loading editor…</div>;

  return (
    <div className="rich-editor">
      <div className="editor-toolbar">
        <button type="button" className={editor.isActive("bold") ? "tool active" : "tool"} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
        <button type="button" className={editor.isActive("italic") ? "tool active" : "tool"} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
        <span className="toolbar-divider" />
        <button type="button" className={editor.isActive("heading", { level: 2 }) ? "tool active" : "tool"} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" className={editor.isActive("bulletList") ? "tool active" : "tool"} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" className="tool image-tool" onClick={openPicker}>▧ Image library</button>
        <button type="button" className="tool" onClick={() => fileInput.current?.click()} disabled={busy}>{busy ? "Uploading…" : "Upload image"}</button>
        <input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(event) => upload(event.target.files?.[0])} />
      </div>
      <EditorContent editor={editor} />
      {error && <p className="inline-error">{error}</p>}
      {pickerOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPickerOpen(false); }}>
          <div className="media-picker">
            <div className="modal-title"><div><span className="eyebrow">MEDIA LIBRARY</span><h2>Choose an image</h2></div><button className="icon-button" onClick={() => setPickerOpen(false)}>×</button></div>
            {media.length ? <div className="picker-grid">{media.map((asset) => (
              <button className="picker-item" key={asset.id} onClick={() => { editor.chain().focus().setImage({ src: asset.url, alt: asset.originalName }).run(); setPickerOpen(false); }}>
                <img src={asset.url} alt="" /><span>{asset.originalName}</span>
              </button>
            ))}</div> : <p className="muted">No images yet. Upload one to get started.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
