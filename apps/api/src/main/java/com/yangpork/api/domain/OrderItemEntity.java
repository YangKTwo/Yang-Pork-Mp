package com.yangpork.api.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
public class OrderItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String orderId;

    @Column(nullable = false, length = 40)
    private String productId;

    @Column(nullable = false, length = 16)
    private String skuCode;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(nullable = false, length = 8)
    private String unit;

    @Column(nullable = false)
    private long priceFen;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal quantity;

    @Column(nullable = false)
    private long lineTotalFen;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public String getSkuCode() { return skuCode; }
    public void setSkuCode(String skuCode) { this.skuCode = skuCode; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public long getPriceFen() { return priceFen; }
    public void setPriceFen(long priceFen) { this.priceFen = priceFen; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public long getLineTotalFen() { return lineTotalFen; }
    public void setLineTotalFen(long lineTotalFen) { this.lineTotalFen = lineTotalFen; }
}
