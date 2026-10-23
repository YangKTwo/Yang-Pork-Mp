package com.yangpork.api.security;

public final class AuthContext {
    private static final ThreadLocal<AuthUser> TL = new ThreadLocal<>();

    private AuthContext() {}

    public static void set(AuthUser user) { TL.set(user); }
    public static AuthUser get() { return TL.get(); }
    public static void clear() { TL.remove(); }
}
