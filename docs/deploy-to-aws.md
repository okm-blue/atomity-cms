# Deploy to AWS

This repository is a monorepo: the Next.js application is in `frontend/`, and the Spring Boot API
is in `backend/`. The root `amplify.yml` configures Amplify to build the frontend from its actual
directory. Building the repository root instead can produce a deployed branch with no website
routes, which commonly appears as an Amplify “page can't be found” page.

The frontend uses Next.js server rendering and a server-side API proxy, so deploy it to Amplify
Hosting compute, not as a static export. Amplify currently supports Next.js through version 15; the
frontend is pinned to 15.5.29 for that runtime.

## 1. Deploy the backend

Run the Spring Boot API as an ECS Fargate service behind an HTTPS Application Load Balancer. Use
PostgreSQL on RDS and mount EFS at `/data/media`; the backend stores uploaded images on disk, and
container-local storage is not durable across service replacements.

Build the container from the repository root with `backend` as the build context (the Dockerfile is
`backend/Dockerfile`). Configure the ECS service to listen on port `8080`, and set the load
balancer's health-check path to `/health/readiness`. Keep RDS private and allow database ingress
only from the ECS task security group. Allow NFS (TCP 2049) to the EFS mount targets only from that
same task security group.

Set `SPRING_PROFILES_ACTIVE=production` on the task. This profile requires all of the following
values; missing database credentials, admin password hash, JWT secret, or public URL prevent the
backend from starting with development defaults:

| ECS setting | Value |
|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<RDS-endpoint>:5432/atomity_cms` |
| `SPRING_DATASOURCE_USERNAME` | RDS username; inject from Secrets Manager |
| `SPRING_DATASOURCE_PASSWORD` | RDS password; inject from Secrets Manager |
| `ADMIN_EMAIL` | Admin sign-in email |
| `ADMIN_PASSWORD_HASH` | BCrypt hash of the admin password; inject from Secrets Manager |
| `JWT_SECRET` | Random secret of at least 32 characters; inject from Secrets Manager |
| `JWT_TTL` | For example, `8h` |
| `MEDIA_STORAGE_DIR` | `/data/media` (the EFS mount) |
| `CMS_PUBLIC_BASE_URL` | Public HTTPS API origin, e.g. `https://api.example.com` |

Use an ACM certificate and a DNS name for the API, terminate HTTPS at the load balancer, and
redirect HTTP to HTTPS. The `CMS_PUBLIC_BASE_URL` must be that HTTPS origin: media URLs are returned
by the API and loaded directly by the browser. Do not put database credentials, password hashes, or
the JWT secret in source control or Amplify variables.

## 2. Configure Amplify Hosting

Connect the repository and branch in Amplify. For a new app, select **My app is a monorepo** and
set the app root to `frontend`. For an existing app, ensure its monorepo root and
`AMPLIFY_MONOREPO_APP_ROOT` environment variable are both `frontend`. The root `amplify.yml` builds
the app, runs its lint/type/test/build checks, and publishes the `.next` output.

Set these Amplify environment variables for the deployed branch:

| Variable | Value |
|---|---|
| `BACKEND_API_URL` | Public HTTPS API origin from step 1, e.g. `https://api.example.com` |
| `SESSION_COOKIE_SECURE` | `true` |
| `AMPLIFY_MONOREPO_APP_ROOT` | `frontend` |

`BACKEND_API_URL` is server-side only. Browser requests use the same-origin `/api/cms/*` proxy,
which forwards them to the backend; the frontend and API do not need cross-origin browser access.
After saving build settings or environment variables, redeploy the branch.

## 3. Verify the deployment

Check backend readiness first:

```bash
curl -f https://api.example.com/health/readiness
```

It should return `{"status":"ready"}`. Then open the Amplify branch URL and visit `/signin`; sign in
with the configured admin email and password, and verify that the content and media screens can
load data. Upload an image and verify it remains available after an ECS task replacement.

If Amplify still shows a not-found page, check the branch build log for the `frontend` app root and
Next.js build. Confirm the branch is using Amplify Hosting compute (Next.js SSR), that
`AMPLIFY_MONOREPO_APP_ROOT=frontend`, and that the artifact directory is `.next`. The root
`package-lock.json` is not a root application; the Next.js `package.json` is under `frontend/`.
