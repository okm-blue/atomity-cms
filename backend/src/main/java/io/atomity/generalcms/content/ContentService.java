package io.atomity.generalcms.content;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.atomity.generalcms.content.ContentPost.ContentStatus;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class ContentService {
    private static final Pattern SLUG_PATTERN = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");
    private final ContentPostRepository posts;
    private final ObjectMapper objectMapper;

    public ContentService(ContentPostRepository posts, ObjectMapper objectMapper) {
        this.posts = posts;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Page<ContentPost> list(String type, String status, String search, int page, int size) {
        if (type != null && ContentTypes.get(type) == null) {
            throw new IllegalArgumentException("Unknown content type: " + type);
        }
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("page must be non-negative and size must be between 1 and 100");
        }
        ContentStatus parsedStatus = status == null || status.isBlank()
            ? null
            : parseStatus(status);
        Specification<ContentPost> specification = (root, query, builder) -> builder.conjunction();
        if (type != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("type"), type));
        }
        if (parsedStatus != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("status"), parsedStatus));
        }
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
            specification = specification.and((root, query, builder) ->
                builder.like(builder.lower(root.get("title")), pattern));
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
        return posts.findAll(specification, pageable);
    }

    @Transactional
    public ContentPost create(PostRequest request) {
        String type = validateType(request.type());
        ContentPost post = new ContentPost(type, emptyBody(), objectMapper.createObjectNode(), Instant.now());
        return saveChanges(post, request);
    }

    @Transactional
    public ContentPost update(UUID id, PostRequest request) {
        ContentPost post = get(id);
        if (!post.getType().equals(request.type())) {
            throw new IllegalArgumentException("A content item's type cannot be changed");
        }
        if (request.version() == null || request.version() != post.getVersion()) {
            throw new ContentConflictException("This item has changed since you opened it. Reload before saving.");
        }
        if (post.getStatus() == ContentStatus.ARCHIVED) {
            throw new IllegalArgumentException("Archived content cannot be edited");
        }
        post.update(
            clean(request.title()), normalizeSlug(request.slug(), request.title()),
            clean(request.excerpt()), jsonObject(request.body(), "body"),
            jsonObject(request.fields(), "fields"), Instant.now()
        );
        validateDraftSlug(post.getType(), post.getSlug(), post.getId());
        return posts.saveAndFlush(post);
    }

    @Transactional
    public ContentPost publish(UUID id) {
        ContentPost post = get(id);
        if (post.getStatus() == ContentStatus.ARCHIVED) {
            throw new IllegalArgumentException("Archived content cannot be published");
        }
        List<String> problems = validationErrors(post);
        if (!problems.isEmpty()) {
            throw new ContentValidationException(problems);
        }
        validateSlug(post.getType(), post.getSlug(), post.getId());
        post.publish(Instant.now());
        return posts.saveAndFlush(post);
    }

    @Transactional
    public ContentPost unpublish(UUID id) {
        ContentPost post = get(id);
        if (post.getStatus() != ContentStatus.PUBLISHED) {
            throw new IllegalArgumentException("Only published content can be unpublished");
        }
        post.unpublish(Instant.now());
        return posts.saveAndFlush(post);
    }

    @Transactional
    public ContentPost archive(UUID id) {
        ContentPost post = get(id);
        post.archive(Instant.now());
        return posts.saveAndFlush(post);
    }

    @Transactional(readOnly = true)
    public ContentPost get(UUID id) {
        return posts.findById(id).orElseThrow(() -> new EntityNotFoundException("Content not found"));
    }

    @Transactional(readOnly = true)
    public Page<ContentPost> publicList(String type, int page, int size) {
        validateType(type);
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("page must be non-negative and size must be between 1 and 100");
        }
        Specification<ContentPost> specification = (root, query, builder) -> builder.and(
            builder.equal(root.get("type"), type),
            builder.equal(root.get("status"), ContentStatus.PUBLISHED)
        );
        return posts.findAll(specification, PageRequest.of(
            page, size, Sort.by(Sort.Direction.DESC, "publishedAt")
        ));
    }

    @Transactional(readOnly = true)
    public ContentPost publicGet(String type, String slug) {
        validateType(type);
        return posts.findByTypeAndSlugAndStatus(type, slug, ContentStatus.PUBLISHED)
            .orElseThrow(() -> new EntityNotFoundException("Content not found"));
    }

    public List<String> validationErrors(ContentPost post) {
        List<String> errors = new ArrayList<>();
        if (post.getTitle().isBlank()) {
            errors.add("Title is required");
        }
        if (post.getTitle().length() > 240) {
            errors.add("Title must be 240 characters or fewer");
        }
        if (!SLUG_PATTERN.matcher(post.getSlug()).matches()) {
            errors.add("Slug must contain lowercase letters, numbers and single hyphens");
        }
        if (!hasText(post.getBody())) {
            errors.add("Body must contain some text");
        }
        ContentTypes.TypeDefinition type = ContentTypes.get(post.getType());
        for (ContentTypes.FieldDefinition field : type.fields()) {
            if (field.required() && !isFilled(post.getFields().get(field.key()))) {
                errors.add(field.label() + " is required");
            }
        }
        JsonNode employmentType = post.getFields().get("employmentType");
        ContentTypes.FieldDefinition employmentField = type.fields().stream()
            .filter(field -> field.key().equals("employmentType")).findFirst().orElse(null);
        if (employmentField != null && isFilled(employmentType)
            && !employmentField.options().contains(employmentType.asText())) {
            errors.add("Employment type is not supported");
        }
        JsonNode applyUrl = post.getFields().get("applyUrl");
        if (applyUrl != null && !applyUrl.isNull() && !applyUrl.asText().isBlank()
            && !isHttpUrl(applyUrl.asText())) {
            errors.add("Application URL must start with http:// or https://");
        }
        JsonNode order = post.getFields().get("order");
        if (order != null && !order.isNull() && !order.isNumber()) {
            errors.add("Order must be a number");
        }
        JsonNode closingDate = post.getFields().get("closingDate");
        if (closingDate != null && !closingDate.isNull() && !closingDate.asText().isBlank()) {
            try {
                java.time.LocalDate.parse(closingDate.asText());
            } catch (java.time.format.DateTimeParseException ex) {
                errors.add("Closing date must be a valid date");
            }
        }
        return errors;
    }

    private ContentPost saveChanges(ContentPost post, PostRequest request) {
        String title = clean(request.title());
        String slug = normalizeSlug(request.slug(), title);
        post.update(title, slug, clean(request.excerpt()), jsonObject(request.body(), "body"),
            jsonObject(request.fields(), "fields"), Instant.now());
        validateDraftSlug(post.getType(), post.getSlug(), post.getId());
        return posts.saveAndFlush(post);
    }

    private void validateDraftSlug(String type, String slug, UUID id) {
        if (!slug.isBlank()) validateSlug(type, slug, id);
    }

    private String validateType(String type) {
        if (type == null || ContentTypes.get(type) == null) {
            throw new IllegalArgumentException("Unknown content type: " + type);
        }
        return type;
    }

    private ContentStatus parseStatus(String status) {
        try {
            return ContentStatus.valueOf(status.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unknown content status: " + status);
        }
    }

    private void validateSlug(String type, String slug, UUID id) {
        if (slug.isBlank() || !SLUG_PATTERN.matcher(slug).matches()) {
            throw new IllegalArgumentException("Slug must contain lowercase letters, numbers and single hyphens");
        }
        if (posts.existsByTypeAndSlugAndIdNot(type, slug, id)) {
            throw new ContentConflictException("A content item with this slug already exists for this type");
        }
    }

    private String normalizeSlug(String supplied, String title) {
        String value = supplied == null || supplied.isBlank() ? title : supplied;
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-+|-+$)", "");
        return normalized.length() > 240 ? normalized.substring(0, 240).replaceAll("-+$", "") : normalized;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private JsonNode jsonObject(JsonNode value, String name) {
        if (value == null) {
            return "body".equals(name) ? emptyBody() : objectMapper.createObjectNode();
        }
        if (!value.isObject()) {
            throw new IllegalArgumentException(name + " must be a JSON object");
        }
        return value;
    }

    private boolean isHttpUrl(String value) {
        try {
            URI uri = URI.create(value);
            return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                && uri.getHost() != null;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private JsonNode emptyBody() {
        ObjectNode doc = objectMapper.createObjectNode();
        doc.put("type", "doc");
        doc.putArray("content");
        return doc;
    }

    private boolean hasText(JsonNode node) {
        if (node == null) return false;
        if (node.isArray()) {
            for (JsonNode child : node) if (hasText(child)) return true;
        } else if (node.isObject()) {
            if ("text".equals(node.path("type").asText()) && !node.path("text").asText().isBlank()) return true;
            var children = node.elements();
            while (children.hasNext()) if (hasText(children.next())) return true;
        }
        return false;
    }

    private boolean isFilled(JsonNode value) {
        if (value == null || value.isNull()) return false;
        return !value.isTextual() || !value.asText().isBlank();
    }

    public record PostRequest(
        String type,
        String title,
        String slug,
        String excerpt,
        JsonNode body,
        JsonNode fields,
        Long version
    ) {}

    public static class ContentConflictException extends RuntimeException {
        public ContentConflictException(String message) { super(message); }
    }

    public static class ContentValidationException extends RuntimeException {
        private final List<String> errors;
        public ContentValidationException(List<String> errors) {
            super("Content is not ready to publish");
            this.errors = List.copyOf(errors);
        }
        public List<String> getErrors() { return errors; }
    }
}
