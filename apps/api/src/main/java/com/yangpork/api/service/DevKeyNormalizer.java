package com.yangpork.api.service;

import org.springframework.util.StringUtils;

/**
 * Normalizes dev/mock stable keys for mock WeChat openid derivation.
 */
public final class DevKeyNormalizer {
    /** Max length of the normalized key segment (after mock_dev_ prefix). */
    public static final int MAX_KEY_LENGTH = 64;

    private DevKeyNormalizer() {}

    /**
     * trim → replace non [A-Za-z0-9._-] with '_' → collapse repeated '_' → truncate.
     */
    public static String normalize(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "";
        }
        String s = raw.trim();
        if (s.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (isAllowed(c)) {
                sb.append(c);
            } else {
                sb.append('_');
            }
        }
        String normalized = collapseUnderscores(sb.toString());
        if (normalized.length() > MAX_KEY_LENGTH) {
            normalized = normalized.substring(0, MAX_KEY_LENGTH);
        }
        return normalized;
    }

    private static boolean isAllowed(char c) {
        return (c >= 'a' && c <= 'z')
                || (c >= 'A' && c <= 'Z')
                || (c >= '0' && c <= '9')
                || c == '.' || c == '_' || c == '-';
    }

    private static String collapseUnderscores(String s) {
        StringBuilder out = new StringBuilder(s.length());
        boolean prevUnderscore = false;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '_') {
                if (!prevUnderscore) {
                    out.append('_');
                }
                prevUnderscore = true;
            } else {
                out.append(c);
                prevUnderscore = false;
            }
        }
        String result = out.toString();
        while (result.startsWith("_")) {
            result = result.substring(1);
        }
        while (result.endsWith("_")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }
}
