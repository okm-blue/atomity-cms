package io.atomity.generalcms.content;

import java.util.List;

public final class ContentTypes {
    private static final List<TypeDefinition> TYPES = List.of(
        new TypeDefinition("news", "News", "News and announcements", "news", List.of()),
        new TypeDefinition("career", "Career", "Job openings and internships", "careers", List.of(
            field("department", "Department", "text", true),
            field("location", "Location", "text", true),
            select("employmentType", "Employment type", true,
                List.of("full-time", "part-time", "intern", "contract")),
            field("applyUrl", "Application URL", "url", true),
            field("closingDate", "Closing date", "date", false),
            field("remote", "Remote", "boolean", false)
        )),
        new TypeDefinition("docs", "Documentation", "Guides and onboarding documentation", "docs", List.of(
            field("section", "Section", "text", true),
            field("order", "Order", "number", false)
        )),
        new TypeDefinition("kb", "Knowledge base", "Troubleshooting articles", "knowledge-base", List.of(
            field("symptom", "Symptom", "text", true),
            field("product", "Product", "text", false),
            field("affectedVersions", "Affected versions", "text", false)
        ))
    );

    private ContentTypes() {}

    public static TypeDefinition get(String key) {
        return TYPES.stream().filter(type -> type.key().equals(key)).findFirst().orElse(null);
    }

    public static List<TypeDefinition> all() {
        return TYPES;
    }

    private static FieldDefinition field(String key, String label, String type, boolean required) {
        return new FieldDefinition(key, label, type, required, List.of());
    }

    private static FieldDefinition select(String key, String label, boolean required, List<String> options) {
        return new FieldDefinition(key, label, "select", required, options);
    }

    public record TypeDefinition(
        String key,
        String label,
        String description,
        String destination,
        List<FieldDefinition> fields
    ) {}

    public record FieldDefinition(
        String key,
        String label,
        String type,
        boolean required,
        List<String> options
    ) {}
}
