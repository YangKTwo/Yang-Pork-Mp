package com.yangpork.api.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "ordering_config")
public class OrderingConfigEntity {
    @Id
    private Long id = 1L;

    @Column(nullable = false, length = 64)
    private String timezone = "Asia/Shanghai";

    @Column(nullable = false, length = 8)
    private String orderWindowStart = "12:00";

    @Column(nullable = false, length = 8)
    private String orderWindowEnd = "22:00";

    @Column(nullable = false, length = 8)
    private String cancelDeadline = "22:00";

    @Column(nullable = false)
    private int pickupDayOffset = 1;

    @Column(nullable = false)
    private long depositThresholdFen = 1000;

    @Column(nullable = false)
    private int depositRateBps = 2000;

    @Column(nullable = false)
    private int payTimeoutSec = 600;

    /** 为空时按 30 解释，便于 ddl-auto 给已有行加可空列。 */
    private Integer defaultCapacityMorning;

    private Integer defaultCapacityNoon;

    private Integer defaultCapacityEvening;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public String getOrderWindowStart() { return orderWindowStart; }
    public void setOrderWindowStart(String orderWindowStart) { this.orderWindowStart = orderWindowStart; }
    public String getOrderWindowEnd() { return orderWindowEnd; }
    public void setOrderWindowEnd(String orderWindowEnd) { this.orderWindowEnd = orderWindowEnd; }
    public String getCancelDeadline() { return cancelDeadline; }
    public void setCancelDeadline(String cancelDeadline) { this.cancelDeadline = cancelDeadline; }
    public int getPickupDayOffset() { return pickupDayOffset; }
    public void setPickupDayOffset(int pickupDayOffset) { this.pickupDayOffset = pickupDayOffset; }
    public long getDepositThresholdFen() { return depositThresholdFen; }
    public void setDepositThresholdFen(long depositThresholdFen) { this.depositThresholdFen = depositThresholdFen; }
    public int getDepositRateBps() { return depositRateBps; }
    public void setDepositRateBps(int depositRateBps) { this.depositRateBps = depositRateBps; }
    public int getPayTimeoutSec() { return payTimeoutSec; }
    public void setPayTimeoutSec(int payTimeoutSec) { this.payTimeoutSec = payTimeoutSec; }
    public Integer getDefaultCapacityMorning() { return defaultCapacityMorning; }
    public void setDefaultCapacityMorning(Integer defaultCapacityMorning) { this.defaultCapacityMorning = defaultCapacityMorning; }
    public Integer getDefaultCapacityNoon() { return defaultCapacityNoon; }
    public void setDefaultCapacityNoon(Integer defaultCapacityNoon) { this.defaultCapacityNoon = defaultCapacityNoon; }
    public Integer getDefaultCapacityEvening() { return defaultCapacityEvening; }
    public void setDefaultCapacityEvening(Integer defaultCapacityEvening) { this.defaultCapacityEvening = defaultCapacityEvening; }
}
