# Public and admin API

The backend listens on port `8080`. All routes use JSON except image uploads. Admin routes require
`Authorization: Bearer <token>`; the Next.js app keeps this token in an HttpOnly session cookie.
There is deliberately no CORS configuration. Consumers should call the public API from their server.

## Authentication

### `POST /api/v1/auth/login`

Request: `{ "email": "admin@example.com", "password": "…" }`

Returns `{ "token": "…", "expiresAt": "…", "email": "…" }`. Tokens are HMAC-SHA256 signed and expire
after `JWT_TTL`. Invalid credentials return `401`.

## Content type metadata

### `GET /api/v1/content-types`

Public. Returns the type keys, labels, descriptions, destination hints, and field definitions. The
destination is descriptive metadata; it never triggers a website build or delivery.

## Admin content

All routes below require a token.

| Method and path | Behavior |
|---|---|
| `GET /api/v1/posts?type=news&status=DRAFT&search=hello&page=0&size=20` | Filter and page all entries; each filter is optional |
| `POST /api/v1/posts` | Create a draft |
| `GET /api/v1/posts/{id}` | Read an entry |
| `PUT /api/v1/posts/{id}` | Save a draft or update a published entry |
| `POST /api/v1/posts/{id}/publish` | Validate required content and publish |
| `POST /api/v1/posts/{id}/unpublish` | Return a published entry to draft |
| `POST /api/v1/posts/{id}/archive` | Archive the entry |

Create and update bodies contain `type`, `title`, `slug`, `excerpt`, Tiptap `body`, type-specific
`fields`, and (for update) the current `version`. Draft text may be incomplete. `PUT` with a stale
version returns `409`; publish validation failures return `422` with a `details` string array.
Slugs are normalized from the title when omitted and are unique within each type.

## Public content

Public routes return published entries only. Drafts and archived entries return `404`.

| Method and path | Behavior |
|---|---|
| `GET /api/v1/content/{type}?page=0&size=20` | Published entries, newest first |
| `GET /api/v1/content/{type}/slug/{slug}` | One published entry |

Responses use Spring's page shape (`content`, `totalElements`, `totalPages`, `number`, `size`). A
content item has `id`, `type`, `title`, `slug`, `excerpt`, Tiptap `body`, `fields`, `status`, and
timestamps. The body is a ProseMirror/Tiptap JSON document; clients choose their own rendering.

## Media

| Method and path | Access | Behavior |
|---|---|---|
| `GET /api/v1/media` | Admin | List uploaded images |
| `POST /api/v1/media` | Admin | Multipart form field `file`; PNG, JPEG, GIF, or WebP up to 10 MB |
| `GET /api/v1/media/files/{storedName}` | Public | Read an uploaded image |

Images are stored under `MEDIA_STORAGE_DIR` and survive container recreation in the `media-data`
volume. SVG is intentionally not accepted. The response URL is absolute and uses
`CMS_PUBLIC_BASE_URL`.

## Health

`GET /health/readiness` checks the database connection and returns `{"status":"ready"}`.
