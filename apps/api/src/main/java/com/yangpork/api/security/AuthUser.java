package com.yangpork.api.security;

import com.yangpork.api.domain.Role;

public record AuthUser(String userId, Role role) {}
