package io.atomity.generalcms.content;

import io.atomity.generalcms.content.ContentPost.ContentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface ContentPostRepository extends JpaRepository<ContentPost, UUID>, JpaSpecificationExecutor<ContentPost> {
    Optional<ContentPost> findByTypeAndSlugAndStatus(String type, String slug, ContentStatus status);
    boolean existsByTypeAndSlugAndIdNot(String type, String slug, UUID id);
    boolean existsByTypeAndSlug(String type, String slug);
}
