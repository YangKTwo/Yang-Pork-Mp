package com.yangpork.api.service;

import com.yangpork.api.domain.OrderingConfigEntity;
import org.springframework.stereotype.Component;

import java.time.*;
import java.time.format.DateTimeFormatter;

@Component
public class TimeSupport {
    public static final DateTimeFormatter OFFSET_FMT = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    /** 取货日当天此时刻起（含）视为超时未取。与 ordering 时区一起用，默认 Asia/Shanghai。 */
    public static final LocalTime NO_PICKUP_CUTOFF = LocalTime.of(22, 0);

    public ZoneId zone(OrderingConfigEntity cfg) {
        return ZoneId.of(cfg.getTimezone());
    }

    public ZonedDateTime now(OrderingConfigEntity cfg) {
        return ZonedDateTime.now(zone(cfg));
    }

    public LocalTime parseHm(String hm) {
        return LocalTime.parse(hm, DateTimeFormatter.ofPattern("H:mm"));
    }

    public boolean inOrderWindow(OrderingConfigEntity cfg, ZonedDateTime now) {
        LocalTime t = now.toLocalTime();
        LocalTime start = parseHm(cfg.getOrderWindowStart());
        LocalTime end = parseHm(cfg.getOrderWindowEnd());
        return !t.isBefore(start) && !t.isAfter(end);
    }

    public boolean beforeCancelDeadline(OrderingConfigEntity cfg, ZonedDateTime now) {
        LocalTime deadline = parseHm(cfg.getCancelDeadline());
        return !now.toLocalTime().isAfter(deadline);
    }

    public LocalDate nextPickupDate(OrderingConfigEntity cfg, ZonedDateTime now) {
        return now.toLocalDate().plusDays(cfg.getPickupDayOffset());
    }

    public boolean isAtOrAfterNoPickupCutoff(ZonedDateTime now) {
        return !now.toLocalTime().isBefore(NO_PICKUP_CUTOFF);
    }

    /**
     * pickupDate 早于今天，或就是今天且本地时间已到 22:00。
     */
    public boolean isNoPickupDue(LocalDate pickupDate, ZonedDateTime now) {
        LocalDate today = now.toLocalDate();
        if (pickupDate.isBefore(today)) {
            return true;
        }
        if (pickupDate.isEqual(today)) {
            return isAtOrAfterNoPickupCutoff(now);
        }
        return false;
    }

    public String formatNow(OrderingConfigEntity cfg) {
        return now(cfg).format(OFFSET_FMT);
    }

    public String depositFormulaText(OrderingConfigEntity cfg) {
        long yuan = cfg.getDepositThresholdFen() / 100;
        int pct = cfg.getDepositRateBps() / 100;
        return "定金 = 订单金额 × " + pct + "%（订单满 " + yuan + " 元收取）";
    }
}
