package com.yangpork.api.service;

import com.yangpork.api.common.BizException;
import com.yangpork.api.common.ErrorCodes;
import com.yangpork.api.config.AppProperties;
import com.yangpork.api.domain.OrderStatus;
import com.yangpork.api.domain.OrderingConfigEntity;
import com.yangpork.api.domain.PickupSlot;
import com.yangpork.api.domain.Role;
import com.yangpork.api.domain.SlotCapacityOverrideEntity;
import com.yangpork.api.repo.OrderRepository;
import com.yangpork.api.repo.OrderingConfigRepository;
import com.yangpork.api.repo.SlotCapacityOverrideRepository;
import com.yangpork.api.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class ConfigService {
    static final int DEFAULT_SLOT_CAPACITY = 30;
    private static final List<OrderStatus> OCCUPYING = List.of(OrderStatus.PENDING_PREPARE, OrderStatus.PREPARED);

    private final OrderingConfigRepository repo;
    private final SlotCapacityOverrideRepository overrideRepo;
    private final OrderRepository orderRepository;
    private final TimeSupport timeSupport;
    private final AppProperties props;

    public ConfigService(OrderingConfigRepository repo, SlotCapacityOverrideRepository overrideRepo,
                         OrderRepository orderRepository, TimeSupport timeSupport, AppProperties props) {
        this.repo = repo;
        this.overrideRepo = overrideRepo;
        this.orderRepository = orderRepository;
        this.timeSupport = timeSupport;
        this.props = props;
    }

    @Transactional
    public OrderingConfigEntity getOrInit() {
        OrderingConfigEntity cfg = repo.findById(1L).orElseGet(this::createDefault);
        return backfillDefaultCapacity(cfg);
    }

    private OrderingConfigEntity createDefault() {
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
        e.setDefaultCapacityMorning(DEFAULT_SLOT_CAPACITY);
        e.setDefaultCapacityNoon(DEFAULT_SLOT_CAPACITY);
        e.setDefaultCapacityEvening(DEFAULT_SLOT_CAPACITY);
        return repo.save(e);
    }

    private OrderingConfigEntity backfillDefaultCapacity(OrderingConfigEntity e) {
        boolean dirty = false;
        if (e.getDefaultCapacityMorning() == null) {
            e.setDefaultCapacityMorning(DEFAULT_SLOT_CAPACITY);
            dirty = true;
        }
        if (e.getDefaultCapacityNoon() == null) {
            e.setDefaultCapacityNoon(DEFAULT_SLOT_CAPACITY);
            dirty = true;
        }
        if (e.getDefaultCapacityEvening() == null) {
            e.setDefaultCapacityEvening(DEFAULT_SLOT_CAPACITY);
            dirty = true;
        }
        return dirty ? repo.save(e) : e;
    }

    @Transactional
    public Map<String, Object> orderingView() {
        return orderingView(null);
    }

    @Transactional
    public Map<String, Object> orderingView(LocalDate pickupDate) {
        OrderingConfigEntity cfg = getOrInit();
        ZonedDateTime now = timeSupport.now(cfg);
        LocalDate slotDate = pickupDate != null ? pickupDate : timeSupport.nextPickupDate(cfg, now);
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
        data.put("pickupDateForSlots", slotDate.toString());
        data.put("defaultSlotCapacity", defaultSlotCapacityView(cfg));
        data.put("pickupSlots", pickupSlotsView(slotDate));
        data.put("defaultPickupSlot", props.getOrdering().getDefaultPickupSlot());
        String tmplId = props.getWx().getSubscribe().getPreparedTemplateId();
        data.put("subscribePreparedTmplId", tmplId == null || tmplId.isBlank() ? "" : tmplId);
        return data;
    }

    private List<Map<String, Object>> pickupSlotsView(LocalDate date) {
        AppProperties.Ordering o = props.getOrdering();
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(slotEntry(date, PickupSlot.MORNING, o.getPickupSlotMorningLabel(), o.getPickupSlotMorningHint()));
        list.add(slotEntry(date, PickupSlot.NOON, o.getPickupSlotNoonLabel(), o.getPickupSlotNoonHint()));
        list.add(slotEntry(date, PickupSlot.EVENING, o.getPickupSlotEveningLabel(), o.getPickupSlotEveningHint()));
        return list;
    }

    private Map<String, Object> slotEntry(LocalDate date, PickupSlot code, String label, String hint) {
        SlotUsage usage = usage(date, code);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("code", code.name());
        m.put("label", label);
        m.put("hint", hint);
        m.put("capacity", usage.capacity());
        m.put("occupied", usage.occupied());
        m.put("remaining", usage.remaining());
        m.put("full", usage.full());
        return m;
    }

    private Map<String, Integer> defaultSlotCapacityView(OrderingConfigEntity cfg) {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (PickupSlot slot : PickupSlot.values()) {
            m.put(slot.name(), defaultCapacity(cfg, slot));
        }
        return m;
    }

    public int defaultCapacity(OrderingConfigEntity cfg, PickupSlot slot) {
        Integer v = switch (slot) {
            case MORNING -> cfg.getDefaultCapacityMorning();
            case NOON -> cfg.getDefaultCapacityNoon();
            case EVENING -> cfg.getDefaultCapacityEvening();
        };
        return v == null ? DEFAULT_SLOT_CAPACITY : v;
    }

    public int effectiveCapacity(LocalDate date, PickupSlot slot) {
        return overrideRepo.findByPickupDateAndSlot(date, slot)
                .map(SlotCapacityOverrideEntity::getCapacity)
                .orElseGet(() -> defaultCapacity(getOrInit(), slot));
    }

    public boolean isSlotFull(LocalDate date, PickupSlot slot) {
        return usage(date, slot).full();
    }

    public void assertSlotAvailable(LocalDate date, PickupSlot slot) {
        if (isSlotFull(date, slot)) {
            throw new BizException(ErrorCodes.SLOT_FULL, "该时段已约满");
        }
    }

    private SlotUsage usage(LocalDate date, PickupSlot slot) {
        int capacity = effectiveCapacity(date, slot);
        long occ = orderRepository.countByPickupDateAndPickupSlotAndStatusIn(date, slot, OCCUPYING);
        int occupied = occ > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) occ;
        int remaining = capacity <= 0 ? 0 : Math.max(0, capacity - occupied);
        return new SlotUsage(capacity, occupied, remaining, remaining == 0);
    }

    public LocalDate parseOptionalPickupDate(String raw) {
        if (raw == null || raw.isBlank() || "null".equalsIgnoreCase(raw.trim())) {
            return null;
        }
        return parsePickupDate(raw.trim());
    }

    public LocalDate parseRequiredPickupDate(String raw) {
        if (raw == null || raw.isBlank() || "null".equalsIgnoreCase(raw.trim())) {
            throw new BizException(ErrorCodes.BAD_PARAM, "pickupDate 必填");
        }
        return parsePickupDate(raw.trim());
    }

    private LocalDate parsePickupDate(String raw) {
        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException ex) {
            throw new BizException(ErrorCodes.BAD_PARAM, "pickupDate 无效");
        }
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
        if (body.containsKey("defaultSlotCapacity")) {
            applyDefaultSlotCapacity(cfg, body.get("defaultSlotCapacity"));
        }
        repo.save(cfg);
        return orderingView();
    }

    private void applyDefaultSlotCapacity(OrderingConfigEntity cfg, Object raw) {
        Map<String, Object> map = asObjectMap(raw, "defaultSlotCapacity");
        for (Map.Entry<String, Object> e : map.entrySet()) {
            PickupSlot slot = parseSlot(e.getKey(), "defaultSlotCapacity");
            int cap = requireWholeInt(e.getValue(), "defaultSlotCapacity." + slot.name(), true);
            switch (slot) {
                case MORNING -> cfg.setDefaultCapacityMorning(cap);
                case NOON -> cfg.setDefaultCapacityNoon(cap);
                case EVENING -> cfg.setDefaultCapacityEvening(cap);
            }
        }
    }

    @Transactional
    public Map<String, Object> slotCapacityAdminView(AuthUser auth, LocalDate pickupDate) {
        requireAdmin(auth);
        if (pickupDate == null) {
            throw new BizException(ErrorCodes.BAD_PARAM, "pickupDate 必填");
        }
        return slotCapacityView(pickupDate);
    }

    @Transactional
    public Map<String, Object> updateSlotCapacity(AuthUser auth, Map<String, Object> body) {
        requireAdmin(auth);
        if (body == null) {
            throw new BizException(ErrorCodes.BAD_PARAM, "请求体不能为空");
        }
        LocalDate date = parseRequiredPickupDate(body.get("pickupDate") == null ? null : String.valueOf(body.get("pickupDate")));
        boolean clearAll = body.containsKey("clearAll") && truthy(body.get("clearAll"));
        List<SlotPatch> patches = parseCapacityPatches(body);
        if (clearAll) {
            overrideRepo.deleteByPickupDate(date);
        }
        for (SlotPatch patch : patches) {
            applyPatch(date, patch);
        }
        return slotCapacityView(date);
    }

    private Map<String, Object> slotCapacityView(LocalDate pickupDate) {
        OrderingConfigEntity cfg = getOrInit();
        Map<PickupSlot, Integer> overrideBySlot = new EnumMap<>(PickupSlot.class);
        for (SlotCapacityOverrideEntity row : overrideRepo.findByPickupDate(pickupDate)) {
            overrideBySlot.put(row.getSlot(), row.getCapacity());
        }
        Map<String, Integer> overrides = new LinkedHashMap<>();
        Map<String, Object> effective = new LinkedHashMap<>();
        for (PickupSlot slot : PickupSlot.values()) {
            if (overrideBySlot.containsKey(slot)) {
                overrides.put(slot.name(), overrideBySlot.get(slot));
            }
            SlotUsage u = usage(pickupDate, slot);
            Map<String, Object> one = new LinkedHashMap<>();
            one.put("capacity", u.capacity());
            one.put("occupied", u.occupied());
            one.put("remaining", u.remaining());
            one.put("full", u.full());
            effective.put(slot.name(), one);
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("pickupDate", pickupDate.toString());
        data.put("defaultSlotCapacity", defaultSlotCapacityView(cfg));
        data.put("overrides", overrides);
        data.put("effective", effective);
        return data;
    }

    private List<SlotPatch> parseCapacityPatches(Map<String, Object> body) {
        if (!body.containsKey("capacities")) {
            return List.of();
        }
        Map<String, Object> map = asObjectMap(body.get("capacities"), "capacities");
        List<SlotPatch> patches = new ArrayList<>();
        for (Map.Entry<String, Object> e : map.entrySet()) {
            PickupSlot slot = parseSlot(e.getKey(), "capacities");
            if (e.getValue() == null) {
                patches.add(new SlotPatch(slot, null));
            } else {
                patches.add(new SlotPatch(slot, requireWholeInt(e.getValue(), "capacities." + slot.name(), false)));
            }
        }
        return patches;
    }

    private void applyPatch(LocalDate date, SlotPatch patch) {
        var existing = overrideRepo.findByPickupDateAndSlot(date, patch.slot());
        if (patch.capacity() == null) {
            existing.ifPresent(overrideRepo::delete);
            return;
        }
        SlotCapacityOverrideEntity e = existing.orElseGet(() -> {
            SlotCapacityOverrideEntity created = new SlotCapacityOverrideEntity();
            created.setPickupDate(date);
            created.setSlot(patch.slot());
            return created;
        });
        e.setCapacity(patch.capacity());
        overrideRepo.save(e);
    }

    private Map<String, Object> asObjectMap(Object raw, String field) {
        if (!(raw instanceof Map<?, ?> map)) {
            throw new BizException(ErrorCodes.BAD_PARAM, field + " 须为对象");
        }
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<?, ?> e : map.entrySet()) {
            if (e.getKey() == null) {
                throw new BizException(ErrorCodes.BAD_PARAM, field + " 时段无效");
            }
            out.put(String.valueOf(e.getKey()), e.getValue());
        }
        return out;
    }

    private PickupSlot parseSlot(String raw, String field) {
        if (raw == null || raw.isBlank() || "null".equalsIgnoreCase(raw.trim())) {
            throw new BizException(ErrorCodes.BAD_PARAM, field + " 时段无效");
        }
        try {
            return PickupSlot.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BizException(ErrorCodes.BAD_PARAM, field + " 时段无效");
        }
    }

    private int requireWholeInt(Object raw, String field, boolean positive) {
        if (raw == null) {
            throw new BizException(ErrorCodes.BAD_PARAM, field + " 非法");
        }
        long value;
        if (raw instanceof Number n) {
            double d = n.doubleValue();
            if (Double.isNaN(d) || Double.isInfinite(d) || d != Math.rint(d)) {
                throw new BizException(ErrorCodes.BAD_PARAM, field + " 须为整数");
            }
            value = n.longValue();
        } else if (raw instanceof String s) {
            try {
                value = Long.parseLong(s.trim());
            } catch (NumberFormatException ex) {
                throw new BizException(ErrorCodes.BAD_PARAM, field + " 须为整数");
            }
        } else {
            throw new BizException(ErrorCodes.BAD_PARAM, field + " 须为整数");
        }
        if (value > Integer.MAX_VALUE) {
            throw new BizException(ErrorCodes.BAD_PARAM, field + " 超出范围");
        }
        if (positive && value <= 0) {
            throw new BizException(ErrorCodes.BAD_PARAM, field + " 须为正整数");
        }
        if (!positive && value < 0) {
            throw new BizException(ErrorCodes.BAD_PARAM, field + " 须为非负整数");
        }
        return (int) value;
    }

    private boolean truthy(Object raw) {
        if (raw instanceof Boolean b) {
            return b;
        }
        return "true".equalsIgnoreCase(String.valueOf(raw).trim());
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

    private record SlotUsage(int capacity, int occupied, int remaining, boolean full) {}

    private record SlotPatch(PickupSlot slot, Integer capacity) {}
}
