package io.atomity.generalcms.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@Service
public class AuthService {
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private final String adminEmail;
    private final String passwordHash;
    private final byte[] secret;
    private final Duration tokenTtl;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    public AuthService(
        @Value("${cms.admin-email}") String adminEmail,
        @Value("${cms.admin-password-hash:}") String configuredHash,
        @Value("${cms.jwt-secret}") String jwtSecret,
        @Value("${cms.jwt-ttl:8h}") String jwtTtl,
        PasswordEncoder passwordEncoder,
        ObjectMapper objectMapper
    ) {
        if (jwtSecret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 characters");
        }
        this.adminEmail = adminEmail;
        this.passwordEncoder = passwordEncoder;
        this.passwordHash = configuredHash.isBlank() ? passwordEncoder.encode("admin") : configuredHash;
        this.secret = jwtSecret.getBytes(StandardCharsets.UTF_8);
        this.tokenTtl = parseTtl(jwtTtl);
        this.objectMapper = objectMapper;
    }

    public LoginResult login(String email, String password) {
        if (email == null || password == null
            || !adminEmail.equalsIgnoreCase(email.trim())
            || !passwordEncoder.matches(password, passwordHash)) {
            throw new InvalidCredentialsException();
        }
        Instant expiresAt = Instant.now().plus(tokenTtl);
        ObjectNode claims = objectMapper.createObjectNode();
        claims.put("sub", adminEmail);
        claims.put("exp", expiresAt.getEpochSecond());
        String header = encode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload;
        try {
            payload = encode(objectMapper.writeValueAsBytes(claims));
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
            throw new IllegalStateException("Could not encode authentication token", ex);
        }
        String signingInput = header + "." + payload;
        String token = signingInput + "." + encode(sign(signingInput));
        return new LoginResult(token, expiresAt, adminEmail);
    }

    public boolean isValid(String token) {
        if (token == null) return false;
        try {
            String[] parts = token.split("\\.", -1);
            if (parts.length != 3) return false;
            String signingInput = parts[0] + "." + parts[1];
            byte[] signature = Base64.getUrlDecoder().decode(parts[2]);
            if (!MessageDigest.isEqual(sign(signingInput), signature)) return false;
            JsonNode header = objectMapper.readTree(Base64.getUrlDecoder().decode(parts[0]));
            JsonNode claims = objectMapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
            return "HS256".equals(header.path("alg").asText())
                && adminEmail.equalsIgnoreCase(claims.path("sub").asText())
                && claims.path("exp").asLong() > Instant.now().getEpochSecond();
        } catch (IllegalArgumentException | java.io.IOException ex) {
            return false;
        }
    }

    private String encode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private byte[] sign(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException ex) {
            throw new IllegalStateException("Could not sign authentication token", ex);
        }
    }

    private Duration parseTtl(String value) {
        try {
            Duration parsed;
            if (value.matches("\\d+[smhd]")) {
                long amount = Long.parseLong(value.substring(0, value.length() - 1));
                parsed = switch (value.charAt(value.length() - 1)) {
                    case 's' -> Duration.ofSeconds(amount);
                    case 'm' -> Duration.ofMinutes(amount);
                    case 'h' -> Duration.ofHours(amount);
                    case 'd' -> Duration.ofDays(amount);
                    default -> throw new IllegalArgumentException("Unsupported JWT_TTL unit");
                };
            } else {
                parsed = Duration.parse(value);
            }
            if (parsed.isZero() || parsed.isNegative()) throw new IllegalArgumentException("JWT_TTL must be positive");
            return parsed;
        } catch (RuntimeException ex) {
            throw new IllegalStateException("JWT_TTL must be a positive duration such as 8h or PT8H", ex);
        }
    }

    public record LoginResult(String token, Instant expiresAt, String email) {}

    public static class InvalidCredentialsException extends RuntimeException {}
}
