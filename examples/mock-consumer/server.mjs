import http from "node:http";
import { renderContentItem, renderContentList } from "./renderer.mjs";

const port = Number(process.env.PORT ?? 4000);
const apiUrl = (process.env.CMS_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (segments.length > 2 || (segments.length > 0 && !/^[a-z0-9-]+$/.test(segments[0]))) {
    response.writeHead(404).end("Not found");
    return;
  }
  const type = segments[0] ?? "news";
  try {
    const endpoint = segments.length === 2
      ? `/api/v1/content/${encodeURIComponent(type)}/slug/${encodeURIComponent(segments[1])}`
      : `/api/v1/content/${encodeURIComponent(type)}?size=20`;
    const result = await fetch(`${apiUrl}${endpoint}`, { signal: AbortSignal.timeout(5000) });
    if (result.status === 404) {
      response.writeHead(404, { "content-type": "text/html; charset=utf-8" })
        .end("<!doctype html><title>Not found</title><h1>Content not found</h1>");
      return;
    }
    if (!result.ok) throw new Error(`CMS API returned ${result.status}`);
    const data = await result.json();
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    }).end(segments.length === 2
      ? renderContentItem(data)
      : renderContentList(type, data.content));
  } catch (error) {
    response.writeHead(502, { "content-type": "text/html; charset=utf-8" })
      .end(renderContentList(type, [], error instanceof Error ? error.message : "CMS API is unavailable"));
  }
});

server.listen(port, "0.0.0.0", () => console.log(`Mock consumer listening on http://localhost:${port}`));
