package com.yangpork.api.web;

import com.yangpork.api.common.ApiResponse;
import com.yangpork.api.security.AuthContext;
import com.yangpork.api.service.ProductService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class ProductController {
    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/products")
    public ApiResponse<List<Map<String, Object>>> list(
            @RequestParam(value = "includeOffShelf", required = false) String includeOffShelf) {
        boolean all = "1".equals(includeOffShelf) || "true".equalsIgnoreCase(includeOffShelf);
        return ApiResponse.ok(productService.list(AuthContext.get(), all));
    }

    @GetMapping("/products/{id}")
    public ApiResponse<Map<String, Object>> get(@PathVariable String id) {
        return ApiResponse.ok(productService.get(id));
    }

    @PostMapping("/admin/products")
    public ApiResponse<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(productService.create(AuthContext.get(), body));
    }

    @PutMapping("/admin/products/{id}")
    public ApiResponse<Map<String, Object>> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(productService.update(AuthContext.get(), id, body));
    }

    @PatchMapping("/admin/products/{id}/shelf")
    public ApiResponse<Map<String, Object>> shelf(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(productService.shelf(AuthContext.get(), id, String.valueOf(body.get("status"))));
    }
}
