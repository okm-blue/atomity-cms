export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type FieldDefinition = {
  key: string;
  label: string;
  type: "text" | "url" | "date" | "number" | "boolean" | "select";
  required: boolean;
  options: string[];
};

export type ContentType = {
  key: string;
  label: string;
  description: string;
  destination: string;
  fields: FieldDefinition[];
};

export type ContentPost = {
  id: string;
  type: string;
  title: string;
  slug: string;
  excerpt: string;
  body: Record<string, unknown>;
  fields: Record<string, unknown>;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  version: number;
  validationErrors: string[];
};

export type MediaAsset = {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
};

export type PageResult<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export class CmsError extends Error {
  status: number;
  details: string[];

  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = "CmsError";
    this.status = status;
    this.details = details;
  }
}

export async function cmsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/cms/${path.replace(/^\/+/, "")}`, {
    ...init,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as {
    error?: string;
    details?: string[];
  };
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/signin")) {
      window.dispatchEvent(new Event("cms-auth-expired"));
    }
    throw new CmsError(payload.error ?? `Request failed (${response.status})`, response.status, payload.details);
  }
  return payload as T;
}

export function emptyDocument() {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function slugify(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
