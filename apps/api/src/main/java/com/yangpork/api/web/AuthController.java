package com.yangpork.api.web;

import com.yangpork.api.common.ApiResponse;
import com.yangpork.api.security.AuthContext;
import com.yangpork.api.service.AuthService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/wx-login")
    public ApiResponse<Map<String, Object>> wxLogin(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-Dev-Key", required = false) String headerDevKey) {
        return ApiResponse.ok(authService.wxLogin(
                stringField(body, "code"),
                stringField(body, "devKey"),
                stringField(body, "mockOpenid"),
                headerDevKey));
    }

    private static String stringField(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v == null ? null : String.valueOf(v);
    }

    @PostMapping("/profile")
    public ApiResponse<Map<String, Object>> profile(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(authService.updateProfile(
                AuthContext.get(),
                body.get("realName") == null ? null : String.valueOf(body.get("realName")),
                body.get("phone") == null ? null : String.valueOf(body.get("phone"))));
    }

    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> me() {
        return ApiResponse.ok(authService.me(AuthContext.get()));
    }
}
