package com.yangpork.api.service;

import com.yangpork.api.common.BizException;
import com.yangpork.api.common.ErrorCodes;
import com.yangpork.api.domain.ProductEntity;
import com.yangpork.api.domain.ProductStatus;
import com.yangpork.api.domain.Role;
import com.yangpork.api.repo.ProductRepository;
import com.yangpork.api.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.*;

@Service
public class ProductService {
    private final ProductRepository productRepository;
    private final IdGenerator idGenerator;
    private final ConfigService configService;

    public ProductService(ProductRepository productRepository, IdGenerator idGenerator, ConfigService configService) {
        this.productRepository = productRepository;
        this.idGenerator = idGenerator;
        this.configService = configService;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(AuthUser auth, boolean includeOffShelf) {
        List<ProductEntity> list;
        if (includeOffShelf) {
            if (auth.role() != Role.ADMIN && auth.role() != Role.SHOP) {
                throw new BizException(ErrorCodes.FORBIDDEN, "无权查看下架商品");
            }
            list = productRepository.findAllByOrderBySortAscSkuCodeAsc();
        } else {
            list = productRepository.findByStatusOrderBySortAscSkuCodeAsc(ProductStatus.ON_SHELF);
        }
        return list.stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get(String id) {
        return toView(require(id));
    }

    public ProductEntity require(String id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new BizException(ErrorCodes.NOT_FOUND, "商品不存在"));
    }

    @Transactional
    public Map<String, Object> create(AuthUser auth, Map<String, Object> body) {
        configService.requireAdmin(auth);
        ProductEntity p = new ProductEntity();
        p.setId(idGenerator.productId());
        apply(p, body, true);
        p.setCreatedAt(Instant.now());
        p.setUpdatedAt(Instant.now());
        return toView(productRepository.save(p));
    }

    @Transactional
    public Map<String, Object> update(AuthUser auth, String id, Map<String, Object> body) {
        configService.requireAdmin(auth);
        ProductEntity p = require(id);
        apply(p, body, false);
        p.setUpdatedAt(Instant.now());
        return toView(productRepository.save(p));
    }

    @Transactional
    public Map<String, Object> shelf(AuthUser auth, String id, String status) {
        configService.requireAdmin(auth);
        ProductEntity p = require(id);
        p.setStatus(ProductStatus.valueOf(status));
        p.setUpdatedAt(Instant.now());
        return toView(productRepository.save(p));
    }

    private void apply(ProductEntity p, Map<String, Object> body, boolean creating) {
        if (creating || body.containsKey("skuCode")) {
            String sku = String.valueOf(body.get("skuCode"));
            if (!StringUtils.hasText(sku) || "null".equals(sku)) throw new BizException(ErrorCodes.BAD_PARAM, "skuCode 必填");
            p.setSkuCode(sku);
        }
        if (creating || body.containsKey("name")) p.setName(String.valueOf(body.get("name")));
        if (creating || body.containsKey("unit")) p.setUnit(String.valueOf(body.get("unit")));
        if (creating || body.containsKey("priceFen")) p.setPriceFen(Long.parseLong(String.valueOf(body.get("priceFen"))));
        if (body.containsKey("remark")) p.setRemark(body.get("remark") == null ? null : String.valueOf(body.get("remark")));
        if (body.containsKey("sort")) p.setSort(Integer.parseInt(String.valueOf(body.get("sort"))));
        if (body.containsKey("status")) p.setStatus(ProductStatus.valueOf(String.valueOf(body.get("status"))));
        else if (creating) p.setStatus(ProductStatus.ON_SHELF);
    }

    public Map<String, Object> toView(ProductEntity p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("skuCode", p.getSkuCode());
        m.put("name", p.getName());
        m.put("unit", p.getUnit());
        m.put("priceFen", p.getPriceFen());
        m.put("status", p.getStatus().name());
        m.put("remark", p.getRemark());
        m.put("sort", p.getSort());
        return m;
    }
}
