package com.yangpork.api.service;

import com.yangpork.api.common.BizException;
import com.yangpork.api.common.ErrorCodes;
import com.yangpork.api.config.AppProperties;
import com.yangpork.api.domain.OrderingConfigEntity;
import com.yangpork.api.domain.Role;
import com.yangpork.api.repo.OrderingConfigRepository;
import com.yangpork.api.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ConfigService {
    private final OrderingConfigRepository repo;
    private final TimeSupport timeSupport;
    private final AppProperties props;

    public ConfigService(OrderingConfigRepository repo, TimeSupport timeSupport, AppProperties props) {
        this.repo = repo;
        this.timeSupport = timeSupport;
        this.props = props;
    }

    @Transactional
    public OrderingConfigEntity getOrInit() {
        return repo.findById(1L).orElseGet(() -> {
            OrderingConfigEntity e = new OrderingConfigEntity();
            AppProperties.Ordering o = props.getOrdering();
            e.setId(1L);
            e.setTimezone(o.getTimezone());
            e.setOrderWindowStart(o.getOrderWindowStart());
            e.setOrderWindowEnd(o.getOrderWindowEnd());
            e.setCancelDeadline(o.getCancelDeadline());
            e.setPickupDayOffset(o.getPickupDayOffset());
            e.setDepositThresholdFen(o.getDepositThresholdFen());
            e.setDepositRateBps(o.getDepositRateBps());
            e.setPayTimeoutSec(o.getPayTimeoutSec());
            return repo.save(e);
        });
    }

    @Transactional
    public Map<String, Object> orderingView() {
        OrderingConfigEntity cfg = getOrInit();
        ZonedDateTime now = timeSupport.now(cfg);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("timezone", cfg.getTimezone());
        data.put("orderWindowStart", cfg.getOrderWindowStart());
        data.put("orderWindowEnd", cfg.getOrderWindowEnd());
        data.put("cancelDeadline", cfg.getCancelDeadline());
        data.put("pickupDayOffset", cfg.getPickupDayOffset());
        data.put("depositThresholdFen", cfg.getDepositThresholdFen());
        data.put("depositRateBps", cfg.getDepositRateBps());
        data.put("payTimeoutSec", cfg.getPayTimeoutSec());
        data.put("depositFormulaText", timeSupport.depositFormulaText(cfg));
        data.put("canOrderNow", timeSupport.inOrderWindow(cfg, now));
        data.put("serverNow", timeSupport.formatNow(cfg));
        data.put("nextPickupDate", timeSupport.nextPickupDate(cfg, now).toString());
        return data;
    }

    @Transactional
    public Map<String, Object> updateOrdering(AuthUser auth, Map<String, Object> body) {
        requireAdmin(auth);
        OrderingConfigEntity cfg = getOrInit();
        if (body.containsKey("orderWindowStart")) cfg.setOrderWindowStart(String.valueOf(body.get("orderWindowStart")));
        if (body.containsKey("orderWindowEnd")) cfg.setOrderWindowEnd(String.valueOf(body.get("orderWindowEnd")));
        if (body.containsKey("cancelDeadline")) cfg.setCancelDeadline(String.valueOf(body.get("cancelDeadline")));
        if (body.containsKey("depositThresholdFen")) cfg.setDepositThresholdFen(asLong(body.get("depositThresholdFen")));
        if (body.containsKey("depositRateBps")) cfg.setDepositRateBps(asInt(body.get("depositRateBps")));
        if (body.containsKey("payTimeoutSec")) cfg.setPayTimeoutSec(asInt(body.get("payTimeoutSec")));
        if (body.containsKey("pickupDayOffset")) cfg.setPickupDayOffset(asInt(body.get("pickupDayOffset")));
        repo.save(cfg);
        return orderingView();
    }

    public void requireAdmin(AuthUser auth) {
        if (auth == null || auth.role() != Role.ADMIN) {
            throw new BizException(ErrorCodes.FORBIDDEN, "需要 ADMIN");
        }
    }

    public void requireShopOrAdmin(AuthUser auth) {
        if (auth == null || (auth.role() != Role.SHOP && auth.role() != Role.ADMIN)) {
            throw new BizException(ErrorCodes.FORBIDDEN, "需要 SHOP/ADMIN");
        }
    }

    private long asLong(Object o) { return Long.parseLong(String.valueOf(o)); }
    private int asInt(Object o) { return Integer.parseInt(String.valueOf(o)); }
}
