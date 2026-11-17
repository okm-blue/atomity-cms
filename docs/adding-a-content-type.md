# Adding a content type

Content type keys and field metadata live in
[`ContentTypes.java`](../backend/src/main/java/io/atomity/generalcms/content/ContentTypes.java).
The same metadata drives the admin field form and the `/api/v1/content-types` response.

1. Add a stable lowercase key, label, description, destination hint, and field definitions to
   `ContentTypes`.
2. Extend `validationErrors` in `ContentService` for publish requirements and any type-specific
   formats. Keep draft saves permissive.
3. If the new fields need special storage or database constraints, add a Flyway migration rather
   than relying on Hibernate schema generation.
4. Add focused service tests for valid and invalid publish cases.
5. Add the type's sample to `examples/mock-consumer/seed.mjs` and run the backend and consumer tests.

Destination hints do not cause deployments, webhooks, builds, or cache invalidation.
