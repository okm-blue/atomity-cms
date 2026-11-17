package io.atomity.generalcms.content;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "content_posts")
public class ContentPost {
    @Id
    private UUID id;

    @Column(nullable = false, length = 32)
    private String type;

    @Column(nullable = false, length = 240)
    private String title = "";

    @Column(nullable = false, length = 240)
    private String slug = "";

    @Column(nullable = false, columnDefinition = "text")
    private String excerpt = "";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private JsonNode body;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private JsonNode fields;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ContentStatus status = ContentStatus.DRAFT;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Version
    @Column(nullable = false)
    private long version;

    protected ContentPost() {}

    public ContentPost(String type, JsonNode emptyDocument, JsonNode emptyFields, Instant now) {
        this.id = UUID.randomUUID();
        this.type = type;
        this.body = emptyDocument;
        this.fields = emptyFields;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public String getType() { return type; }
    public String getTitle() { return title; }
    public String getSlug() { return slug; }
    public String getExcerpt() { return excerpt; }
    public JsonNode getBody() { return body; }
    public JsonNode getFields() { return fields; }
    public ContentStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getPublishedAt() { return publishedAt; }
    public long getVersion() { return version; }

    public void update(String title, String slug, String excerpt, JsonNode body, JsonNode fields, Instant now) {
        this.title = title;
        this.slug = slug;
        this.excerpt = excerpt;
        this.body = body;
        this.fields = fields;
        this.updatedAt = now;
    }

    public void publish(Instant now) {
        this.status = ContentStatus.PUBLISHED;
        this.publishedAt = now;
        this.updatedAt = now;
    }

    public void unpublish(Instant now) {
        this.status = ContentStatus.DRAFT;
        this.publishedAt = null;
        this.updatedAt = now;
    }

    public void archive(Instant now) {
        this.status = ContentStatus.ARCHIVED;
        this.updatedAt = now;
    }

    public enum ContentStatus {
        DRAFT,
        PUBLISHED,
        ARCHIVED
    }
}
