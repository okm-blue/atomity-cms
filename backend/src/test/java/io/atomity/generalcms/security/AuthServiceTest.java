package io.atomity.generalcms.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthServiceTest {
    @Test
    void issuedTokensAreSignedAndTamperingIsRejected() {
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode("admin")).thenReturn("hash");
        when(encoder.matches("secret", "hash")).thenReturn(true);
        AuthService service = new AuthService(
            "admin@example.com", "", "01234567890123456789012345678901", "8h", encoder, new ObjectMapper()
        );

        String token = service.login("admin@example.com", "secret").token();

        assertTrue(service.isValid(token));
        assertFalse(service.isValid(token + "tampered"));
        assertFalse(service.isValid("not-a-token"));
    }
}
