package com.yangpork.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String payMode = "mock";
    private Wx wx = new Wx();
    private Jwt jwt = new Jwt();
    private Roles roles = new Roles();
    private Ordering ordering = new Ordering();

    public String getPayMode() { return payMode; }
    public void setPayMode(String payMode) { this.payMode = payMode; }
    public Wx getWx() { return wx; }
    public void setWx(Wx wx) { this.wx = wx; }
    public Jwt getJwt() { return jwt; }
    public void setJwt(Jwt jwt) { this.jwt = jwt; }
    public Roles getRoles() { return roles; }
    public void setRoles(Roles roles) { this.roles = roles; }
    public Ordering getOrdering() { return ordering; }
    public void setOrdering(Ordering ordering) { this.ordering = ordering; }

    public static class Wx {
        /** mock | real */
        private String mode = "mock";
        private String appId;
        private String appSecret;

        public String getMode() { return mode; }
        public void setMode(String mode) { this.mode = mode; }
        public String getAppId() { return appId; }
        public void setAppId(String appId) { this.appId = appId; }
        public String getAppSecret() { return appSecret; }
        public void setAppSecret(String appSecret) { this.appSecret = appSecret; }

        public boolean isMockMode() {
            return mode == null || mode.isBlank() || "mock".equalsIgnoreCase(mode.trim());
        }

        public boolean isRealMode() {
            return "real".equalsIgnoreCase(mode == null ? "" : mode.trim());
        }
    }

    public static class Jwt {
        private String secret;
        private long expiresInSec = 7200;
        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
        public long getExpiresInSec() { return expiresInSec; }
        public void setExpiresInSec(long expiresInSec) { this.expiresInSec = expiresInSec; }
    }

    public static class Roles {
        private List<String> adminPhones = new ArrayList<>();
        private List<String> shopPhones = new ArrayList<>();
        public List<String> getAdminPhones() { return adminPhones; }
        public void setAdminPhones(List<String> adminPhones) { this.adminPhones = adminPhones; }
        public List<String> getShopPhones() { return shopPhones; }
        public void setShopPhones(List<String> shopPhones) { this.shopPhones = shopPhones; }
    }

    public static class Ordering {
        private String timezone = "Asia/Shanghai";
        private String orderWindowStart = "12:00";
        private String orderWindowEnd = "22:00";
        private String cancelDeadline = "22:00";
        private int pickupDayOffset = 1;
        private long depositThresholdFen = 1000;
        private int depositRateBps = 2000;
        private int payTimeoutSec = 600;
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
    }
}
