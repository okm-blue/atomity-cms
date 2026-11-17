# Atomity CMS

Open-source CMS for the content that sits next to a product: **news**, **career openings**,
**documentation** and **knowledge-base** articles.

An editor chooses a content type, fills in guided fields, saves a draft, validates it and publishes.
Published content is then available through a public, read-only API so separate websites can fetch
and render it. **This CMS never controls how those websites look.**

> **Status: initial skeleton.** The local workflow supports creating, validating, publishing and
> reading content through the public API, with an example consumer. It is not production-ready, and
> nothing in this repository talks to any Atomity production system.

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Tiptap
- **Backend:** Spring Boot 3.4, Java 21, Gradle
- **Database:** PostgreSQL 16, schema managed by Flyway
- **Media:** images on the local filesystem (a Docker volume); no external storage

## What it does and does not do

| It does | It does not |
|---|---|
| Four content types with guided fields and publish validation | Render, host or deploy any website |
| Draft → published → archived lifecycle with update and unpublish | Push content anywhere: no webhooks, builds or cache revalidation |
| A public read API that only returns published content | Manage several users or roles (one admin account) |
| Rich text (Tiptap JSON) and local image uploads | Schedule posts, keep revisions or translate content |
| An example website (`examples/mock-consumer`) that consumes the API | Decide where a type is shown; the destination is descriptive metadata |

## Content types

| Key | Purpose | Extra fields (**bold** = required to publish) |
|---|---|---|
| `news` | Announcements and updates | None |
| `career` | Job openings and internships | **department**, **location**, **employmentType** (`full-time`, `part-time`, `intern`, `contract`), **applyUrl**, closingDate, remote |
| `docs` | Guides and onboarding documentation | **section**, order |
| `kb` | Troubleshooting and knowledge-base articles | **symptom**, product, affectedVersions |

Every item also has a title, slug, excerpt, rich-text body, status and timestamps. Drafts can be
saved incomplete; publishing requires a title, body text and the type's required fields. Slugs are
unique within a type. Type metadata lives in
[`ContentTypes.java`](backend/src/main/java/io/atomity/generalcms/content/ContentTypes.java); see
[Adding a content type](docs/adding-a-content-type.md).

## Admin UI

Sign in, then open **Content** to filter by type and status, search, or create an entry. The editor
offers title, slug, excerpt, a Tiptap editor with images from the media library, and type-specific
fields. Drafts may be incomplete; **Publish** reports missing requirements. Published items can be
updated or unpublished, and the menu archives them. Optimistic version checks prevent stale saves
from silently overwriting someone else's update. **Media** is the local image library.

## Publishing and consuming content

```text
editor (admin UI)              backend                         website (any consumer)
─────────────────              ───────────────────────         ──────────────────────
save draft             ───►    POST /api/v1/posts
Publish                ───►    POST /api/v1/posts/{id}/publish
                               validates → PUBLISHED
                                                       ◄────    GET /api/v1/content/{type}
                                                       ◄────    GET /api/v1/content/{type}/slug/{slug}
```

Publish only changes the item's database status. Websites pull content whenever they choose:

```bash
curl -s localhost:8080/api/v1/content-types
curl -s 'localhost:8080/api/v1/content/career?size=10'
curl -s localhost:8080/api/v1/content/news/slug/my-first-post
```

The body is a Tiptap/ProseMirror JSON document; the consumer renders it however it likes.
[`examples/mock-consumer`](examples/mock-consumer) is a small server-rendered example. Fetch from
the website's server: the API has no CORS configuration. See [docs/api.md](docs/api.md) for all
endpoints and response shapes.

## Quick start (Docker)

Requires Docker with Compose v2. No JDK, Node, PostgreSQL or external accounts are needed.

```powershell
Copy-Item .env.example .env
docker compose up --build
```

The first build downloads dependencies and may take a few minutes. The local sign-in is
**admin@example.com / admin** when `ADMIN_PASSWORD_HASH` is blank. This is only a local development
default; configure a bcrypt hash and a private JWT secret before any deployment.

| Service | URL |
|---|---|
| Admin UI | http://localhost:3000 |
| Backend | http://localhost:8080/health/readiness |
| Postgres | `localhost:5432` (credentials from `.env`) |

Ports are configurable with `POSTGRES_PORT`, `BACKEND_PORT` and `FRONTEND_PORT`. If another local
stack uses these ports, change them in `.env`.

### Try the whole flow

With the stack running:

```powershell
docker compose --profile demo up --build
```

The example website is at **http://localhost:4000**. The demo profile also runs the `mock-seed`
container, which creates a draft of each type, confirms drafts are private, proves an incomplete
career is rejected, publishes complete entries and reads them through the public API. Check its
output with `docker compose logs mock-seed`. It exits non-zero if a step fails and can be run
repeatedly.

### Logs, stopping and resetting

```powershell
docker compose logs -f backend
docker compose down
```

`docker compose down` keeps the database and uploaded images. **Destructive:** `docker compose down -v`
also deletes the `postgres-data` volume (all content) and `media-data` volume (all uploaded images).

## Tests

| Command | What it runs | Needs |
|---|---|---|
| `make docker-test` | Backend JUnit 5 tests, including Testcontainers against PostgreSQL | Docker |
| `make docker-check` | Frontend lint, TypeScript, Vitest and production build | Docker |
| `make consumer-test` | Example website renderer tests | Node.js |
| `make check` | Backend tests and frontend checks on the host | Java 21, Node.js ≥ 20.9, Docker |

`make docker-test` mounts the Docker socket so Testcontainers can start PostgreSQL. It is written for
Docker Desktop and may need adjusting on Linux.

## Local development without containers for the apps

Run Postgres in Docker, then run the backend and frontend on the host:

```powershell
docker compose up -d postgres
Set-Location backend; .\gradlew.bat bootRun
```

In another terminal:

```powershell
Set-Location frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

The frontend reads the backend URL from `BACKEND_API_URL`; `.env.local` is git-ignored. Local
sign-in defaults are the same as the Docker stack.

## AWS Amplify Hosting

The root `amplify.yml` configures Amplify's **Deploy app** workflow for the Next.js app in
`frontend/`. Select `frontend` as the monorepo app root when connecting the repository. Set the
Amplify environment variables `BACKEND_API_URL` to your deployed backend's HTTPS origin and
`SESSION_COOKIE_SECURE` to `true`. Amplify hosts the frontend; the Spring API and PostgreSQL
database must already be reachable at that backend URL.

## Configuration

| Variable | App | Description |
|---|---|---|
| `SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD` | Backend | Database connection |
| `ADMIN_EMAIL` | Backend | Email of the single admin account |
| `ADMIN_PASSWORD_HASH` | Backend | bcrypt hash of the admin password; blank uses the local-only `admin` default |
| `JWT_SECRET` | Backend | HMAC signing secret, at least 32 characters |
| `JWT_TTL` | Backend | Session length (default `8h`) |
| `MEDIA_STORAGE_DIR` | Backend | Local image directory (`/data/media` in Docker) |
| `CMS_PUBLIC_BASE_URL` | Backend | Base URL used in public image URLs |
| `SERVER_PORT` | Backend | HTTP port (default `8080`) |
| `BACKEND_API_URL` | Frontend | Backend URL, used server-side by the proxy |
| `SESSION_COOKIE_SECURE` | Frontend | Set `true` to require HTTPS for the session cookie |
| `CMS_API_URL` | Example consumer | Where the example website reads content from |

Generate a bcrypt hash with `htpasswd`:

```bash
docker run --rm httpd:2.4-alpine htpasswd -nbBC 10 "" 'your-password' | tr -d ':\n'
```

In `.env`, wrap the hash in single quotes because it contains `$` characters:

```dotenv
ADMIN_PASSWORD_HASH='$2y$10$...'
```

## Repository layout

```text
atomity-cms/
├── backend/                  Spring Boot API (Gradle, Dockerfile)
├── frontend/                 Next.js admin UI (npm, Dockerfile)
├── examples/mock-consumer/   Zero-dependency Node website and publishing demo
├── docs/                     Architecture, API reference, adding a content type
├── docker-compose.yml        Postgres + backend + frontend (+ demo consumer profile)
└── Makefile                  Local and Docker checks
```

## Contributing

Start with [docs/architecture.md](docs/architecture.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
This repository is intended for local development and contributors; it does not need production
access. See the [Code of Conduct](CODE_OF_CONDUCT.md) and [SECURITY.md](SECURITY.md).
