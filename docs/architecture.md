# Architecture

Atomity CMS is a small single-admin content service. The Next.js App Router frontend is the editorial
interface; a Spring Boot API owns authentication, validation, lifecycle, persistence and media. A
PostgreSQL database stores content JSON and metadata, while image bytes live on a local Docker volume.

## Request boundaries

- The frontend sends admin requests through its same-origin `/api/cms/*` proxy. The proxy stores the
  signed API token in an HttpOnly cookie and forwards it as a bearer token.
- The backend protects admin endpoints with a signed, expiring HMAC token. The public content
  endpoints return only `PUBLISHED` entries. No CORS configuration or browser-facing admin token is
  needed.
- The public API does not deliver content to other systems. Consumers fetch it on their own schedule.
- The destination hint on each content type is metadata only.

## Content lifecycle

`DRAFT -> PUBLISHED -> DRAFT` (unpublish), or `DRAFT/PUBLISHED -> ARCHIVED`.
Drafts may be incomplete. The publish operation validates title, body text, type-specific required
fields, URL/date/number formats, and slug. The database enforces unique non-empty slugs per type.
`@Version` plus an explicit request version prevents overwriting an editor's newer save.

## Storage and migrations

Flyway owns all schema changes. Hibernate validates the schema at startup and does not create tables.
Content `body` and `fields` are JSONB to preserve Tiptap documents and type-specific metadata. Media
records are in PostgreSQL; bytes are in the configured media directory, backed by Compose's
`media-data` volume.

## Adding a content type

See [Adding a content type](./adding-a-content-type.md). Keep keys, publish rules, admin metadata and
consumer-visible API behavior in sync, and include tests for required fields.
