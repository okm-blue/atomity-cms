package io.atomity.generalcms.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class AdminTokenFilter extends OncePerRequestFilter {
    private final AuthService authService;

    public AdminTokenFilter(AuthService authService) {
        this.authService = authService;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean protectedApi = path.startsWith("/api/v1/")
            && !path.equals("/api/v1/auth/login")
            && !path.equals("/api/v1/content-types")
            && !path.startsWith("/api/v1/content/")
            && !path.startsWith("/api/v1/media/files/");
        if (!protectedApi) {
            filterChain.doFilter(request, response);
            return;
        }
        String authorization = request.getHeader("Authorization");
        String token = authorization != null && authorization.startsWith("Bearer ")
            ? authorization.substring(7)
            : null;
        if (!authService.isValid(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Authentication required\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
