const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function renderMarks(text, marks = []) {
  return marks.reduce((value, mark) => {
    if (mark.type === "bold") return `<strong>${value}</strong>`;
    if (mark.type === "italic") return `<em>${value}</em>`;
    if (mark.type === "code") return `<code>${value}</code>`;
    if (mark.type === "link") {
      const href = safeUrl(mark.attrs?.href);
      return href ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${value}</a>` : value;
    }
    return value;
  }, escapeHtml(text));
}

function renderNode(node) {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text") return renderMarks(node.text, node.marks);
  const children = Array.isArray(node.content) ? node.content.map(renderNode).join("") : "";
  switch (node.type) {
    case "doc": return children;
    case "paragraph": return `<p>${children}</p>`;
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 2));
      return `<h${level}>${children}</h${level}>`;
    }
    case "bulletList": return `<ul>${children}</ul>`;
    case "orderedList": return `<ol>${children}</ol>`;
    case "listItem": return `<li>${children}</li>`;
    case "blockquote": return `<blockquote>${children}</blockquote>`;
    case "hardBreak": return "<br>";
    case "horizontalRule": return "<hr>";
    case "image": {
      const src = safeUrl(node.attrs?.src);
      return src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(node.attrs?.alt)}">` : "";
    }
    default: return children;
  }
}

export function renderRichText(document) {
  return renderNode(document);
}

export function renderContentList(type, items, error = "") {
  const entries = items.map((item) => `
    <article class="entry">
      <span class="kind">${escapeHtml(type)}</span>
      <h2><a href="/${encodeURIComponent(type)}/${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h2>
      <p class="excerpt">${escapeHtml(item.excerpt)}</p>
      <span class="date">${item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ""}</span>
    </article>`).join("");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(type)} · Product journal</title><style>
    *{box-sizing:border-box}body{margin:0;background:#f7f8f6;color:#17211d;font:16px/1.6 Arial,sans-serif}
    header{padding:60px max(calc((100vw - 880px)/2),24px) 36px;background:#eaf2ec}
    header small{color:#58816a;font-weight:bold;letter-spacing:1px;text-transform:uppercase}
    header h1{margin:10px 0;font-size:38px;letter-spacing:-1px}header p{margin:0;color:#6b786e}
    main{max-width:880px;margin:32px auto;padding:0 24px}.entry{padding:23px 0;border-bottom:1px solid #e4e9e4}
    .kind,.date{color:#79877d;font-size:12px}.entry h2{margin:5px 0;font-size:23px}.entry a{color:inherit;text-decoration:none}
    .entry a:hover{color:#25694b}.excerpt{color:#68756b}.empty,.error{padding:25px;border:1px solid #e3e9e3;border-radius:8px;background:white}
    .body{margin:20px auto;max-width:760px;padding:0 24px}.body img{max-width:100%;height:auto}.back{color:#528066}
  </style><header><small>Product journal · Powered by Atomity CMS</small><h1>${escapeHtml(type)}</h1><p>Content is fetched live from the public read API.</p></header>
  <main>${error ? `<div class="error">${escapeHtml(error)}</div>` : entries || '<div class="empty">No published content yet.</div>'}</main></html>`;
}

export function renderContentItem(item) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(item.title)}</title><style>
    body{margin:0;background:#f7f8f6;color:#17211d;font:16px/1.8 Arial,sans-serif}
    main{max-width:760px;margin:50px auto;padding:0 24px}h1{font-size:38px;line-height:1.2;letter-spacing:-1px}
    .excerpt{color:#69766d}.body{margin-top:32px}.body img{max-width:100%;height:auto;border-radius:8px}
    .back{color:#528066;text-decoration:none;font-size:13px}.kind{color:#728278;font-size:12px;text-transform:uppercase;letter-spacing:1px}
  </style><main><a class="back" href="/${encodeURIComponent(item.type)}">← Back to ${escapeHtml(item.type)}</a>
  <p class="kind">${escapeHtml(item.type)}</p><h1>${escapeHtml(item.title)}</h1><p class="excerpt">${escapeHtml(item.excerpt)}</p>
  <article class="body">${renderRichText(item.body)}</article></main></html>`;
}
