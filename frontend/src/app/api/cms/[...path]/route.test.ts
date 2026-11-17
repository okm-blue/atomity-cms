import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const request = () => new NextRequest("https://cms.example.com/api/cms/api/v1/content-types");
const context = { params: Promise.resolve({ path: ["api", "v1", "content-types"] }) };

describe("CMS API proxy deployment configuration", () => {
  it("reports a missing backend URL instead of calling localhost in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKEND_API_URL", "");

    const response = await GET(request(), context);

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("BACKEND_API_URL") });
  });

  it("rejects an insecure public backend URL in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKEND_API_URL", "http://api.example.com");

    const response = await GET(request(), context);

    expect(response.status).toBe(503);
  });

  it("proxies to the configured HTTPS backend", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKEND_API_URL", "https://api.example.com/");
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('[{"key":"news"}]', { headers: { "content-type": "application/json" } }),
    );

    const response = await GET(request(), context);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/content-types",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ key: "news" }]);
  });

  it("allows the private Docker Compose backend over its internal HTTP network", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKEND_API_URL", "http://backend:8080");
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { headers: { "content-type": "application/json" } }),
    );

    const response = await GET(request(), context);

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith("http://backend:8080/api/v1/content-types", expect.any(Object));
  });
});
