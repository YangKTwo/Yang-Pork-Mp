package com.yangpork.api.web;

import com.yangpork.api.common.ApiResponse;
import com.yangpork.api.security.AuthContext;
import com.yangpork.api.service.OrderService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(orderService.createPreorder(AuthContext.get(), body));
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(orderService.myOrders(AuthContext.get(), page, pageSize));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> get(@PathVariable String id) {
        return ApiResponse.ok(orderService.getMine(AuthContext.get(), id));
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<Map<String, Object>> cancel(@PathVariable String id) {
        return ApiResponse.ok(orderService.cancelByCustomer(AuthContext.get(), id));
    }

    @PostMapping("/{id}/pay")
    public ApiResponse<Map<String, Object>> pay(@PathVariable String id) {
        return ApiResponse.ok(orderService.pay(AuthContext.get(), id));
    }

    @PostMapping("/{id}/pay/mock-success")
    public ApiResponse<Map<String, Object>> mockSuccess(@PathVariable String id) {
        return ApiResponse.ok(orderService.mockPaySuccess(AuthContext.get(), id));
    }
}
