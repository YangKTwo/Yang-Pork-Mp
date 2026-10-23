package com.yangpork.api.web;

import com.yangpork.api.common.ApiResponse;
import com.yangpork.api.security.AuthContext;
import com.yangpork.api.service.ConfigService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class ConfigController {
    private final ConfigService configService;

    public ConfigController(ConfigService configService) {
        this.configService = configService;
    }

    @GetMapping("/config/ordering")
    public ApiResponse<Map<String, Object>> ordering() {
        return ApiResponse.ok(configService.orderingView());
    }

    @PutMapping("/admin/config/ordering")
    public ApiResponse<Map<String, Object>> update(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(configService.updateOrdering(AuthContext.get(), body));
    }
}
