package io.atomity.generalcms.media;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/media")
public class MediaController {
    private static final long MAX_IMAGE_SIZE = 10L * 1024 * 1024;
    private final MediaAssetRepository repository;
    private final Path mediaDirectory;
    private final String publicBaseUrl;

    public MediaController(
        MediaAssetRepository repository,
        @Value("${cms.media-storage-dir}") String mediaDirectory,
        @Value("${cms.public-base-url:http://localhost:8080}") String publicBaseUrl
    ) throws IOException {
        this.repository = repository;
        this.mediaDirectory = Path.of(mediaDirectory).toAbsolutePath().normalize();
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
        Files.createDirectories(this.mediaDirectory);
    }

    @GetMapping
    public List<MediaResponse> list() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
            .map(asset -> MediaResponse.from(asset, publicBaseUrl)).toList();
    }

    @PostMapping
    public MediaResponse upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("Choose an image smaller than 10 MB");
        }
        byte[] bytes = file.getBytes();
        String contentType = detectImageType(bytes);
        if (contentType == null) {
            throw new IllegalArgumentException("Only PNG, JPEG, GIF and WebP images are supported");
        }
        String extension = switch (contentType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            default -> throw new IllegalStateException("Unsupported image type");
        };
        UUID id = UUID.randomUUID();
        String storedName = id + extension;
        Path target = mediaDirectory.resolve(storedName).normalize();
        if (!target.getParent().equals(mediaDirectory)) {
            throw new IllegalStateException("Invalid media filename");
        }
        Files.write(target, bytes, java.nio.file.StandardOpenOption.CREATE_NEW);
        String originalName = file.getOriginalFilename() == null
            ? "image" + extension
            : file.getOriginalFilename().replace('\\', '/').replaceAll("^.*/", "");
        MediaAsset asset = repository.save(new MediaAsset(
            id, originalName, storedName, contentType, bytes.length, Instant.now()
        ));
        return MediaResponse.from(asset, publicBaseUrl);
    }

    @GetMapping("/files/{storedName}")
    public ResponseEntity<Resource> read(@PathVariable String storedName) {
        if (!storedName.matches("[0-9a-fA-F-]{36}\\.(png|jpg|gif|webp)")) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND
            );
        }
        MediaAsset asset = repository.findByStoredName(storedName)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND
            ));
        Path file = mediaDirectory.resolve(storedName).normalize();
        if (!file.getParent().equals(mediaDirectory) || !Files.isRegularFile(file)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND
            );
        }
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(asset.getContentType()))
            .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
            .header("X-Content-Type-Options", "nosniff")
            .body(new FileSystemResource(file));
    }

    private String detectImageType(byte[] bytes) {
        if (bytes.length >= 8
            && (bytes[0] & 0xff) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G'
            && bytes[4] == 0x0d && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a) {
            return "image/png";
        }
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8
            && (bytes[2] & 0xff) == 0xff) {
            return "image/jpeg";
        }
        if (bytes.length >= 6) {
            String header = new String(bytes, 0, 6, java.nio.charset.StandardCharsets.US_ASCII);
            if (header.equals("GIF87a") || header.equals("GIF89a")) return "image/gif";
        }
        if (bytes.length >= 12) {
            String riff = new String(bytes, 0, 4, java.nio.charset.StandardCharsets.US_ASCII);
            String webp = new String(bytes, 8, 4, java.nio.charset.StandardCharsets.US_ASCII);
            if (riff.equals("RIFF") && webp.equals("WEBP")) return "image/webp";
        }
        return null;
    }

    public record MediaResponse(
        UUID id,
        String originalName,
        String contentType,
        long sizeBytes,
        Instant createdAt,
        String url
    ) {
        static MediaResponse from(MediaAsset asset, String publicBaseUrl) {
            return new MediaResponse(asset.getId(), asset.getOriginalName(), asset.getContentType(),
                asset.getSizeBytes(), asset.getCreatedAt(),
                publicBaseUrl + "/api/v1/media/files/" + asset.getStoredName());
        }
    }
}
