# Contributing

This project is an initial local-first CMS skeleton, not a production service. Contributions should
stay focused and include tests for new behavior.

## Development

- Use Java 21 with the Gradle wrapper for the backend; use Node.js 20.9 or newer with npm for the frontend.
- For the full stack, use Docker Compose as described in the root [README](./README.md).
- Keep database changes in Flyway migrations. Do not rely on Hibernate schema creation.
- Preserve the boundary that websites consume published content through the public read API; this
  CMS does not render or deploy those websites.

## Checks

- Backend: `cd backend && ./gradlew test`
- Frontend: `cd frontend && npm run lint && npm run typecheck && npm test && npm run build`
- Example consumer: `cd examples/mock-consumer && npm test`

For changes that touch several services, run the Docker checks described in the README as well.
