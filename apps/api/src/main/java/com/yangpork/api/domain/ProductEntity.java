package com.yangpork.api.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "products")
public class ProductEntity {
    @Id
    @Column(length = 40)
    private String id;

    @Column(nullable = false, unique = true, length = 16)
    private String skuCode;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(nullable = false, length = 8)
    private String unit;

    @Column(nullable = false)
    private long priceFen;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ProductStatus status = ProductStatus.ON_SHELF;

    @Column(length = 200)
    private String remark;

    @Column(nullable = false)
    private int sort = 100;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSkuCode() { return skuCode; }
    public void setSkuCode(String skuCode) { this.skuCode = skuCode; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public long getPriceFen() { return priceFen; }
    public void setPriceFen(long priceFen) { this.priceFen = priceFen; }
    public ProductStatus getStatus() { return status; }
    public void setStatus(ProductStatus status) { this.status = status; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
    public int getSort() { return sort; }
    public void setSort(int sort) { this.sort = sort; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
