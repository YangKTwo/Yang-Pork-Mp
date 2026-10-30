package com.yangpork.api.web;

import com.yangpork.api.common.ApiResponse;
import com.yangpork.api.domain.OrderSource;
import com.yangpork.api.domain.OrderStatus;
import com.yangpork.api.domain.PickupSlot;
import com.yangpork.api.security.AuthContext;
import com.yangpork.api.service.OrderService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/shop/orders")
public class ShopController {
    private final OrderService orderService;

    public ShopController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/preorder")
    public ApiResponse<Map<String, Object>> preorder(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate pickupDate,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) String pickupCode,
            @RequestParam(required = false) PickupSlot pickupSlot,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(orderService.shopList(AuthContext.get(), OrderSource.PREORDER,
                pickupDate, status, pickupCode, pickupSlot, page, pageSize));
    }

    @GetMapping("/manual")
    public ApiResponse<Map<String, Object>> manualList(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate pickupDate,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) String pickupCode,
            @RequestParam(required = false) PickupSlot pickupSlot,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(orderService.shopList(AuthContext.get(), OrderSource.MANUAL,
                pickupDate, status, pickupCode, pickupSlot, page, pageSize));
    }

    @PostMapping("/manual")
    public ApiResponse<Map<String, Object>> createManual(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(orderService.createManual(AuthContext.get(), body));
    }

    @PostMapping("/{id}/prepare")
    public ApiResponse<Map<String, Object>> prepare(@PathVariable String id) {
        return ApiResponse.ok(orderService.prepare(AuthContext.get(), id));
    }

    @PostMapping("/{id}/pickup")
    public ApiResponse<Map<String, Object>> pickup(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String code = body.get("pickupCode") == null ? null : String.valueOf(body.get("pickupCode"));
        return ApiResponse.ok(orderService.pickup(AuthContext.get(), id, code));
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<Map<String, Object>> cancel(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String reason = body.get("reason") == null ? null : String.valueOf(body.get("reason"));
        return ApiResponse.ok(orderService.cancelByShop(AuthContext.get(), id, reason));
    }
}
