package io.atomity.generalcms.content;

import io.atomity.generalcms.content.ContentPost.ContentStatus;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/posts")
public class PostController {
    private final ContentService service;

    public PostController(ContentService service) {
        this.service = service;
    }

    @GetMapping
    public Page<PostResponse> list(
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return service.list(type, status, search, page, size).map(this::response);
    }

    @PostMapping
    public PostResponse create(@Valid @RequestBody ContentService.PostRequest request) {
        return response(service.create(request));
    }

    @GetMapping("/{id}")
    public PostResponse get(@PathVariable UUID id) {
        return response(service.get(id));
    }

    @PutMapping("/{id}")
    public PostResponse update(@PathVariable UUID id, @Valid @RequestBody ContentService.PostRequest request) {
        return response(service.update(id, request));
    }

    @PostMapping("/{id}/publish")
    public PostResponse publish(@PathVariable UUID id) {
        return response(service.publish(id));
    }

    @PostMapping("/{id}/unpublish")
    public PostResponse unpublish(@PathVariable UUID id) {
        return response(service.unpublish(id));
    }

    @PostMapping("/{id}/archive")
    public PostResponse archive(@PathVariable UUID id) {
        return response(service.archive(id));
    }

    private PostResponse response(ContentPost post) {
        return PostResponse.from(post, post.getStatus() == ContentStatus.PUBLISHED
            ? List.of() : service.validationErrors(post));
    }

    public record PostResponse(
        UUID id,
        String type,
        String title,
        String slug,
        String excerpt,
        com.fasterxml.jackson.databind.JsonNode body,
        com.fasterxml.jackson.databind.JsonNode fields,
        ContentStatus status,
        java.time.Instant createdAt,
        java.time.Instant updatedAt,
        java.time.Instant publishedAt,
        long version,
        List<String> validationErrors
    ) {
        static PostResponse from(ContentPost post, List<String> validationErrors) {
            return new PostResponse(post.getId(), post.getType(), post.getTitle(), post.getSlug(),
                post.getExcerpt(), post.getBody(), post.getFields(), post.getStatus(),
                post.getCreatedAt(), post.getUpdatedAt(), post.getPublishedAt(), post.getVersion(),
                validationErrors);
        }
    }
}
