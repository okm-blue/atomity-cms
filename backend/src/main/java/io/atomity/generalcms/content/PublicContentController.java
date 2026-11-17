package io.atomity.generalcms.content;

import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PublicContentController {
    private final ContentService service;

    public PublicContentController(ContentService service) {
        this.service = service;
    }

    @GetMapping("/content-types")
    public java.util.List<ContentTypes.TypeDefinition> types() {
        return ContentTypes.all();
    }

    @GetMapping("/content/{type}")
    public Page<PostController.PostResponse> list(
        @PathVariable String type,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return service.publicList(type, page, size)
            .map(post -> PostController.PostResponse.from(post, java.util.List.of()));
    }

    @GetMapping("/content/{type}/slug/{slug}")
    public PostController.PostResponse get(@PathVariable String type, @PathVariable String slug) {
        return PostController.PostResponse.from(service.publicGet(type, slug), java.util.List.of());
    }
}
