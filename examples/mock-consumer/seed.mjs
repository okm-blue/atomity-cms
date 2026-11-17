const apiUrl = (process.env.CMS_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");
const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.ADMIN_PASSWORD ?? "admin";
const runId = Date.now().toString(36);

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

const login = await request("/api/v1/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!login.response.ok) throw new Error(`Admin sign-in failed (${login.response.status}): ${login.payload.error}`);
const authorization = { authorization: `Bearer ${login.payload.token}` };
const body = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Created by the example website walkthrough." }] }] };

const examples = [
  { type: "news", title: "A new chapter for the product", fields: {} },
  { type: "career", title: "Product engineer", fields: { department: "Engineering", location: "Remote", employmentType: "full-time", applyUrl: "https://example.com/careers" } },
  { type: "docs", title: "Getting started", fields: { section: "Onboarding", order: 1 } },
  { type: "kb", title: "Reset your workspace password", fields: { symptom: "You cannot sign in", product: "Workspace", affectedVersions: "All" } },
];

for (const item of examples) {
  const slug = `demo-${runId}-${item.type}`;
  const created = await request("/api/v1/posts", {
    method: "POST",
    headers: { ...authorization, "content-type": "application/json" },
    body: JSON.stringify({ ...item, slug, excerpt: "A sample item from the Atomity CMS demo.", body }),
  });
  if (!created.response.ok) throw new Error(`Could not create ${item.type}: ${JSON.stringify(created.payload)}`);

  const hidden = await request(`/api/v1/content/${item.type}/slug/${slug}`);
  if (hidden.response.status !== 404) throw new Error(`${item.type} draft was visible before publishing`);

  const published = await request(`/api/v1/posts/${created.payload.id}/publish`, {
    method: "POST",
    headers: authorization,
  });
  if (!published.response.ok) throw new Error(`Could not publish ${item.type}: ${JSON.stringify(published.payload)}`);

  const visible = await request(`/api/v1/content/${item.type}/slug/${slug}`);
  if (!visible.response.ok || visible.payload.status !== "PUBLISHED") {
    throw new Error(`${item.type} did not become publicly available after publishing`);
  }
  console.log(`✓ ${item.type}: hidden as draft, published and fetched through public API`);
}

const incomplete = await request("/api/v1/posts", {
  method: "POST",
  headers: { ...authorization, "content-type": "application/json" },
  body: JSON.stringify({
    type: "career",
    title: "Incomplete sample role",
    slug: `demo-${runId}-incomplete`,
    body,
    fields: {},
  }),
});
if (!incomplete.response.ok) throw new Error("Could not create incomplete career draft");
const refused = await request(`/api/v1/posts/${incomplete.payload.id}/publish`, {
  method: "POST",
  headers: authorization,
});
if (refused.response.status !== 422 || !Array.isArray(refused.payload.details)) {
  throw new Error("Publishing an incomplete career was not rejected with validation details");
}
console.log("✓ incomplete career: publish rejected with field-level validation details");
console.log(`Demo complete. Example website: http://localhost:${process.env.CONSUMER_PORT ?? 4000}`);
