# Ali K. El-Massri

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

The task is complete, you can run the frontend & backend separately, the front will run on port 3000, the back on 8000.

it only works locally i did not deploy it on any platform yet.

if you have any questions email me at: ali.kmassri@gmail.com
