package io.atomity.generalcms.media;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, UUID> {
    List<MediaAsset> findAllByOrderByCreatedAtDesc();
    Optional<MediaAsset> findByStoredName(String storedName);
}
