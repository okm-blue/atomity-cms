CREATE TABLE content_posts (
    id UUID PRIMARY KEY,
    type VARCHAR(32) NOT NULL,
    title VARCHAR(240) NOT NULL DEFAULT '',
    slug VARCHAR(240) NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    body JSONB NOT NULL DEFAULT '{}'::jsonb,
    fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT content_posts_type_check CHECK (type IN ('news', 'career', 'docs', 'kb')),
    CONSTRAINT content_posts_status_check CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

CREATE UNIQUE INDEX content_posts_type_slug_unique
    ON content_posts (type, slug)
    WHERE slug <> '';

CREATE INDEX content_posts_public_listing_idx
    ON content_posts (type, published_at DESC)
    WHERE status = 'PUBLISHED';

CREATE TABLE media_assets (
    id UUID PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(80) NOT NULL UNIQUE,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
