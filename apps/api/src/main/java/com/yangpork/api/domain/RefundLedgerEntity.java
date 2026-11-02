package com.yangpork.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "refund_ledger", indexes = {
        @Index(name = "idx_refund_ledger_order", columnList = "orderId")
})
public class RefundLedgerEntity {
    @Id
    @Column(length = 40)
    private String id;

    @Column(nullable = false, unique = true, length = 40)
    private String orderId;

    @Column(nullable = false)
    private long amountFen;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private RefundLedgerReason reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private RefundLedgerStatus status;

    @Column(nullable = false)
    private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public long getAmountFen() { return amountFen; }
    public void setAmountFen(long amountFen) { this.amountFen = amountFen; }
    public RefundLedgerReason getReason() { return reason; }
    public void setReason(RefundLedgerReason reason) { this.reason = reason; }
    public RefundLedgerStatus getStatus() { return status; }
    public void setStatus(RefundLedgerStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
