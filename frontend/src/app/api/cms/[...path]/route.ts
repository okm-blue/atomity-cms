import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ path: string[] }> };

function getBackendUrl() {
  const configuredUrl = process.env.BACKEND_API_URL;
  if (!configuredUrl) {
    return process.env.NODE_ENV === "production" ? null : "http://localhost:8080";
  }
  try {
    const url = new URL(configuredUrl);
    const localBackendHosts = ["backend", "localhost", "127.0.0.1"];
    if (
      !["http:", "https:"].includes(url.protocol)
      || (
        process.env.NODE_ENV === "production"
        && url.protocol !== "https:"
        && !localBackendHosts.includes(url.hostname)
      )
      || url.pathname !== "/"
      || url.search
      || url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const joinedPath = path.join("/");
  const secureCookie = request.nextUrl.protocol === "https:"
    || process.env.SESSION_COOKIE_SECURE === "true";

  if (joinedPath === "logout") {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("cms_session", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    return NextResponse.json(
      { error: "BACKEND_API_URL must be set to the HTTPS origin of the CMS API" },
      { status: 503 },
    );
  }
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const token = request.cookies.get("cms_session")?.value;
  if (token) headers.set("authorization", `Bearer ${token}`);

  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.arrayBuffer();
  const upstream = await fetch(`${backendUrl}/${joinedPath}${request.nextUrl.search}`, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });
  const responseBody = await upstream.arrayBuffer();
  if (joinedPath === "api/v1/auth/login" && upstream.ok) {
    const result = JSON.parse(new TextDecoder().decode(responseBody)) as {
      token: string;
      expiresAt: string;
      email: string;
    };
    const response = NextResponse.json(
      { expiresAt: result.expiresAt, email: result.email },
      { status: upstream.status },
    );
    const secondsUntilExpiry = Math.max(0, Math.floor((Date.parse(result.expiresAt) - Date.now()) / 1000));
    response.cookies.set("cms_session", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: secondsUntilExpiry,
    });
    return response;
  }
  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) responseHeaders.set("content-type", upstreamContentType);
  const response = new NextResponse(responseBody, {
    status: upstream.status,
    headers: responseHeaders,
  });
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
