package io.atomity.generalcms.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ContentServiceTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ContentService service = new ContentService(null, objectMapper);

    @Test
    void careerRequiresAllPublishingFieldsAndBodyText() {
        ContentPost post = post("career", "Platform engineer", objectMapper.createObjectNode(), false);

        List<String> errors = service.validationErrors(post);
        assertTrue(errors.contains("Body must contain some text"));
        assertTrue(errors.contains("Department is required"));
        assertTrue(errors.contains("Location is required"));
        assertTrue(errors.contains("Employment type is required"));
        assertTrue(errors.contains("Application URL is required"));
    }

    @Test
    void validCareerFieldsAndBodyPassPublishingValidation() {
        ObjectNode fields = objectMapper.createObjectNode();
        fields.put("department", "Engineering");
        fields.put("location", "Remote");
        fields.put("employmentType", "full-time");
        fields.put("applyUrl", "https://example.com/jobs");
        ContentPost post = post("career", "Platform engineer", fields, true);

        assertTrue(service.validationErrors(post).isEmpty());
    }

    @Test
    void rejectsUnsupportedEmploymentTypeAndUnsafeApplicationUrl() {
        ObjectNode fields = objectMapper.createObjectNode();
        fields.put("department", "Engineering");
        fields.put("location", "Remote");
        fields.put("employmentType", "volunteer");
        fields.put("applyUrl", "javascript:alert(1)");
        ContentPost post = post("career", "Platform engineer", fields, true);

        assertTrue(service.validationErrors(post).contains("Employment type is not supported"));
        assertTrue(service.validationErrors(post).contains("Application URL must start with http:// or https://"));
    }

    @Test
    void createsAnIncompleteDraftWhenBodyAndFieldsAreOmitted() {
        ContentPostRepository repository = mock(ContentPostRepository.class);
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        ContentService draftService = new ContentService(repository, objectMapper);

        ContentPost draft = draftService.create(new ContentService.PostRequest(
            "news", null, null, null, null, null, null
        ));

        assertEquals("", draft.getTitle());
        assertEquals("doc", draft.getBody().path("type").asText());
        assertTrue(draft.getFields().isObject());
        assertTrue(draftService.validationErrors(draft).contains("Title is required"));
    }

    @Test
    void rejectsASaveBasedOnAStaleVersion() {
        ContentPostRepository repository = mock(ContentPostRepository.class);
        ContentPost existing = post("news", "Current title", objectMapper.createObjectNode(), true);
        when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));
        ContentService updateService = new ContentService(repository, objectMapper);

        assertThrows(ContentService.ContentConflictException.class, () -> updateService.update(
            existing.getId(),
            new ContentService.PostRequest(
                "news", "Stale title", "stale-title", "", objectMapper.createObjectNode(),
                objectMapper.createObjectNode(), existing.getVersion() + 1
            )
        ));
        verify(repository, never()).saveAndFlush(any());
    }

    private ContentPost post(String type, String title, ObjectNode fields, boolean withBodyText) {
        ContentPost post = new ContentPost(type, objectMapper.createObjectNode(), fields, Instant.now());
        ObjectNode body = objectMapper.createObjectNode();
        body.put("type", "doc");
        var content = body.putArray("content");
        if (withBodyText) {
            content.addObject().put("type", "paragraph")
                .putArray("content").addObject()
                .put("type", "text")
                .put("text", "Role details");
        }
        post.update(title, "platform-engineer", "", body, fields, Instant.now());
        return post;
    }
}
