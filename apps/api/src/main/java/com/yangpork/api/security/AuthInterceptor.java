package com.yangpork.api.security;

import com.yangpork.api.common.BizException;
import com.yangpork.api.common.ErrorCodes;
import com.yangpork.api.domain.Role;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {
    private final JwtService jwtService;

    public AuthInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new BizException(ErrorCodes.UNAUTH, "未登录");
        }
        try {
            Claims claims = jwtService.parse(auth.substring(7));
            Role role = Role.valueOf(claims.get("role", String.class));
            AuthContext.set(new AuthUser(claims.getSubject(), role));
            return true;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            throw new BizException(ErrorCodes.UNAUTH, "登录已失效");
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        AuthContext.clear();
    }
}
