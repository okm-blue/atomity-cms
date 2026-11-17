import test from "node:test";
import assert from "node:assert/strict";
import { renderContentItem, renderContentList, renderRichText } from "../renderer.mjs";

test("renders text and common rich-text nodes as HTML", () => {
  assert.equal(
    renderRichText({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello", marks: [{ type: "bold" }] }] }] }),
    "<p><strong>Hello</strong></p>",
  );
});

test("escapes untrusted text and rejects unsafe links and images", () => {
  const output = renderRichText({
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] },
      { type: "image", attrs: { src: "javascript:alert(1)", alt: "unsafe" } },
    ],
  });
  assert.equal(output, "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
});

test("renders listings and individual entries with escaped titles", () => {
  const listing = renderContentList("news", [{ title: "<hello>", slug: "hello", excerpt: "A story", publishedAt: null }]);
  const item = renderContentItem({ type: "news", title: "<hello>", excerpt: "", body: { type: "doc", content: [] } });
  assert.match(listing, /&lt;hello&gt;/);
  assert.match(item, /&lt;hello&gt;/);
});
