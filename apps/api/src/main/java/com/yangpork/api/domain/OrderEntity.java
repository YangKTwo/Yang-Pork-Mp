package com.yangpork.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "orders", indexes = {
        @Index(name = "idx_orders_user", columnList = "userId"),
        @Index(name = "idx_orders_pickup", columnList = "pickupDate"),
        @Index(name = "idx_orders_status", columnList = "status")
})
public class OrderEntity {
    @Id
    @Column(length = 40)
    private String id;

    @Column(length = 64)
    private String idempotencyKey;

    @Column(nullable = false, length = 40)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private OrderSource source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private OrderStatus status;

    @Column(nullable = false)
    private LocalDate pickupDate;

    @Column(nullable = false)
    private long totalFen;

    @Column(nullable = false)
    private long depositFen;

    @Column(nullable = false)
    private boolean depositRequired;

    @Column(length = 120)
    private String depositFormulaText;

    private Instant payExpireAt;

    @Column(length = 8)
    private String pickupCode;

    private boolean pickupCodeUsed = false;

    @Column(length = 200)
    private String remark;

    @Column(length = 40)
    private String customerRealName;

    @Column(length = 20)
    private String customerPhone;

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private DepositOffline depositOffline;

    private boolean depositPaid = false;

    @Column(length = 16)
    private String cancelSource;

    @Column(length = 120)
    private String cancelReason;

    @Column(length = 40)
    private String cancelOperatorUserId;

    @Column(length = 20)
    private String cancelOperatorRole;

    private Instant cancelledAt;

    @Version
    private long version;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public OrderSource getSource() { return source; }
    public void setSource(OrderSource source) { this.source = source; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public LocalDate getPickupDate() { return pickupDate; }
    public void setPickupDate(LocalDate pickupDate) { this.pickupDate = pickupDate; }
    public long getTotalFen() { return totalFen; }
    public void setTotalFen(long totalFen) { this.totalFen = totalFen; }
    public long getDepositFen() { return depositFen; }
    public void setDepositFen(long depositFen) { this.depositFen = depositFen; }
    public boolean isDepositRequired() { return depositRequired; }
    public void setDepositRequired(boolean depositRequired) { this.depositRequired = depositRequired; }
    public String getDepositFormulaText() { return depositFormulaText; }
    public void setDepositFormulaText(String depositFormulaText) { this.depositFormulaText = depositFormulaText; }
    public Instant getPayExpireAt() { return payExpireAt; }
    public void setPayExpireAt(Instant payExpireAt) { this.payExpireAt = payExpireAt; }
    public String getPickupCode() { return pickupCode; }
    public void setPickupCode(String pickupCode) { this.pickupCode = pickupCode; }
    public boolean isPickupCodeUsed() { return pickupCodeUsed; }
    public void setPickupCodeUsed(boolean pickupCodeUsed) { this.pickupCodeUsed = pickupCodeUsed; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
    public String getCustomerRealName() { return customerRealName; }
    public void setCustomerRealName(String customerRealName) { this.customerRealName = customerRealName; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public DepositOffline getDepositOffline() { return depositOffline; }
    public void setDepositOffline(DepositOffline depositOffline) { this.depositOffline = depositOffline; }
    public boolean isDepositPaid() { return depositPaid; }
    public void setDepositPaid(boolean depositPaid) { this.depositPaid = depositPaid; }
    public String getCancelSource() { return cancelSource; }
    public void setCancelSource(String cancelSource) { this.cancelSource = cancelSource; }
    public String getCancelReason() { return cancelReason; }
    public void setCancelReason(String cancelReason) { this.cancelReason = cancelReason; }
    public String getCancelOperatorUserId() { return cancelOperatorUserId; }
    public void setCancelOperatorUserId(String cancelOperatorUserId) { this.cancelOperatorUserId = cancelOperatorUserId; }
    public String getCancelOperatorRole() { return cancelOperatorRole; }
    public void setCancelOperatorRole(String cancelOperatorRole) { this.cancelOperatorRole = cancelOperatorRole; }
    public Instant getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(Instant cancelledAt) { this.cancelledAt = cancelledAt; }
    public long getVersion() { return version; }
    public void setVersion(long version) { this.version = version; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
