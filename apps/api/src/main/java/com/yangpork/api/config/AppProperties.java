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
        private Subscribe subscribe = new Subscribe();

        public String getMode() { return mode; }
        public void setMode(String mode) { this.mode = mode; }
        public String getAppId() { return appId; }
        public void setAppId(String appId) { this.appId = appId; }
        public String getAppSecret() { return appSecret; }
        public void setAppSecret(String appSecret) { this.appSecret = appSecret; }
        public Subscribe getSubscribe() { return subscribe; }
        public void setSubscribe(Subscribe subscribe) { this.subscribe = subscribe; }

        public static class Subscribe {
            private String preparedTemplateId;

            public String getPreparedTemplateId() { return preparedTemplateId; }
            public void setPreparedTemplateId(String preparedTemplateId) { this.preparedTemplateId = preparedTemplateId; }
        }

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
        private String defaultPickupSlot = "MORNING";
        private String pickupSlotMorningLabel = "上午取";
        private String pickupSlotMorningHint = "08:00–11:00";
        private String pickupSlotNoonLabel = "中午取";
        private String pickupSlotNoonHint = "11:00–14:00";
        private String pickupSlotEveningLabel = "下午取";
        private String pickupSlotEveningHint = "14:00–18:00";
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
        public String getDefaultPickupSlot() { return defaultPickupSlot; }
        public void setDefaultPickupSlot(String defaultPickupSlot) { this.defaultPickupSlot = defaultPickupSlot; }
        public String getPickupSlotMorningLabel() { return pickupSlotMorningLabel; }
        public void setPickupSlotMorningLabel(String pickupSlotMorningLabel) { this.pickupSlotMorningLabel = pickupSlotMorningLabel; }
        public String getPickupSlotMorningHint() { return pickupSlotMorningHint; }
        public void setPickupSlotMorningHint(String pickupSlotMorningHint) { this.pickupSlotMorningHint = pickupSlotMorningHint; }
        public String getPickupSlotNoonLabel() { return pickupSlotNoonLabel; }
        public void setPickupSlotNoonLabel(String pickupSlotNoonLabel) { this.pickupSlotNoonLabel = pickupSlotNoonLabel; }
        public String getPickupSlotNoonHint() { return pickupSlotNoonHint; }
        public void setPickupSlotNoonHint(String pickupSlotNoonHint) { this.pickupSlotNoonHint = pickupSlotNoonHint; }
        public String getPickupSlotEveningLabel() { return pickupSlotEveningLabel; }
        public void setPickupSlotEveningLabel(String pickupSlotEveningLabel) { this.pickupSlotEveningLabel = pickupSlotEveningLabel; }
        public String getPickupSlotEveningHint() { return pickupSlotEveningHint; }
        public void setPickupSlotEveningHint(String pickupSlotEveningHint) { this.pickupSlotEveningHint = pickupSlotEveningHint; }
    }
}
