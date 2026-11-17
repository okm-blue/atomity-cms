package io.atomity.generalcms.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.atomity.generalcms.content.ContentPost.ContentStatus;
import io.atomity.generalcms.content.ContentService.ContentValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class ContentLifecycleIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("cms.media-storage-dir", () -> System.getProperty("java.io.tmpdir") + "/atomity-cms-test-media");
    }

    @Autowired
    private ContentService service;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void onlyPublishedContentAppearsAndUnpublishingRemovesIt() {
        ContentService.PostRequest request = new ContentService.PostRequest(
            "news",
            "Integration test story",
            "integration-" + UUID.randomUUID(),
            "An integration test",
            bodyWithText(),
            objectMapper.createObjectNode(),
            null
        );
        ContentPost draft = service.create(request);
        assertEquals(0, service.publicList("news", 0, 20).getTotalElements());

        ContentPost published = service.publish(draft.getId());
        assertEquals(ContentStatus.PUBLISHED, published.getStatus());
        assertEquals(1, service.publicList("news", 0, 20).getTotalElements());

        assertEquals(ContentStatus.DRAFT, service.unpublish(draft.getId()).getStatus());
        assertEquals(0, service.publicList("news", 0, 20).getTotalElements());
    }

    @Test
    void publishingIncompleteCareerReturnsFieldLevelErrors() {
        ContentService.PostRequest request = new ContentService.PostRequest(
            "career",
            "Incomplete integration role",
            "incomplete-" + UUID.randomUUID(),
            "",
            bodyWithText(),
            objectMapper.createObjectNode(),
            null
        );
        ContentPost draft = service.create(request);

        ContentValidationException error = assertThrows(
            ContentValidationException.class,
            () -> service.publish(draft.getId())
        );
        assertTrue(error.getErrors().contains("Department is required"));
        assertTrue(error.getErrors().contains("Application URL is required"));
    }

    private ObjectNode bodyWithText() {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("type", "doc");
        body.putArray("content").addObject()
            .put("type", "paragraph")
            .putArray("content").addObject()
            .put("type", "text")
            .put("text", "Example body text");
        return body;
    }
}
