package com.yangpork.api.service;

import com.yangpork.api.common.BizException;
import com.yangpork.api.common.ErrorCodes;
import com.yangpork.api.config.AppProperties;
import com.yangpork.api.domain.*;
import com.yangpork.api.repo.OrderItemRepository;
import com.yangpork.api.repo.OrderRepository;
import com.yangpork.api.repo.UserRepository;
import com.yangpork.api.security.AuthUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.*;

@Service
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductService productService;
    private final ConfigService configService;
    private final AuthService authService;
    private final TimeSupport timeSupport;
    private final IdGenerator idGenerator;
    private final AppProperties props;
    private final UserRepository userRepository;
    private final WeChatSubscribeMessageService subscribeMessageService;

    public OrderService(OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                        ProductService productService, ConfigService configService, AuthService authService,
                        TimeSupport timeSupport, IdGenerator idGenerator, AppProperties props,
                        UserRepository userRepository, WeChatSubscribeMessageService subscribeMessageService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productService = productService;
        this.configService = configService;
        this.authService = authService;
        this.timeSupport = timeSupport;
        this.idGenerator = idGenerator;
        this.props = props;
        this.userRepository = userRepository;
        this.subscribeMessageService = subscribeMessageService;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> createPreorder(AuthUser auth, Map<String, Object> body) {
        UserEntity user = authService.requireUser(auth.userId());
        if (!user.isProfileCompleted()) {
            throw new BizException(ErrorCodes.BAD_PARAM, "请先完善资料");
        }
        OrderingConfigEntity cfg = configService.getOrInit();
        ZonedDateTime now = timeSupport.now(cfg);
        if (!timeSupport.inOrderWindow(cfg, now)) {
            throw new BizException(ErrorCodes.OUTSIDE_WINDOW, "当前不在下单窗口（" +
                    cfg.getOrderWindowStart() + "-" + cfg.getOrderWindowEnd() + "）");
        }
        String idem = body.get("idempotencyKey") == null ? null : String.valueOf(body.get("idempotencyKey"));
        if (StringUtils.hasText(idem)) {
            Optional<OrderEntity> exist = orderRepository.findByUserIdAndIdempotencyKey(user.getId(), idem);
            if (exist.isPresent()) {
                return toView(exist.get(), true);
            }
        }
        List<Map<String, Object>> items = (List<Map<String, Object>>) body.get("items");
        if (items == null || items.isEmpty()) {
            throw new BizException(ErrorCodes.BAD_PARAM, "items 不能为空");
        }

        OrderEntity order = new OrderEntity();
        order.setId(idGenerator.orderId());
        order.setIdempotencyKey(idem);
        order.setUserId(user.getId());
        order.setSource(OrderSource.PREORDER);
        order.setPickupDate(timeSupport.nextPickupDate(cfg, now));
        order.setPickupSlot(requirePickupSlot(body));
        order.setSubscribeStatus(parseSubscribeAccept(body));
        order.setRemark(body.get("remark") == null ? null : String.valueOf(body.get("remark")));
        order.setCustomerRealName(user.getRealName());
        order.setCustomerPhone(user.getPhone());
        order.setCreatedAt(Instant.now());
        order.setUpdatedAt(Instant.now());

        List<OrderItemEntity> lines = buildLines(order.getId(), items);
        long total = lines.stream().mapToLong(OrderItemEntity::getLineTotalFen).sum();
        order.setTotalFen(total);
        applyDeposit(order, cfg, total, now.toInstant());

        orderRepository.save(order);
        orderItemRepository.saveAll(lines);
        return toView(order, true);
    }

    private void applyDeposit(OrderEntity order, OrderingConfigEntity cfg, long total, Instant nowInstant) {
        order.setDepositFormulaText(timeSupport.depositFormulaText(cfg));
        if (total <= cfg.getDepositThresholdFen()) {
            order.setDepositRequired(false);
            order.setDepositFen(0);
            order.setStatus(OrderStatus.PENDING_PREPARE);
            order.setPickupCode(idGenerator.pickupCode());
            order.setPayExpireAt(null);
            order.setDepositPaid(false);
        } else {
            long deposit = BigDecimal.valueOf(total)
                    .multiply(BigDecimal.valueOf(cfg.getDepositRateBps()))
                    .divide(BigDecimal.valueOf(10000), 0, RoundingMode.HALF_UP)
                    .longValue();
            order.setDepositRequired(true);
            order.setDepositFen(deposit);
            order.setStatus(OrderStatus.PENDING_PAY);
            order.setPayExpireAt(nowInstant.plusSeconds(cfg.getPayTimeoutSec()));
            order.setPickupCode(null);
            order.setDepositPaid(false);
        }
    }

    private List<OrderItemEntity> buildLines(String orderId, List<Map<String, Object>> items) {
        List<OrderItemEntity> lines = new ArrayList<>();
        for (Map<String, Object> it : items) {
            String productId = String.valueOf(it.get("productId"));
            ProductEntity p = productService.require(productId);
            if (p.getStatus() != ProductStatus.ON_SHELF) {
                throw new BizException(ErrorCodes.BAD_PARAM, "商品未上架: " + p.getSkuCode());
            }
            BigDecimal qty = new BigDecimal(String.valueOf(it.get("quantity")));
            if (qty.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BizException(ErrorCodes.BAD_PARAM, "数量必须大于0");
            }
            if (!"斤".equals(p.getUnit())) {
                if (qty.stripTrailingZeros().scale() > 0) {
                    throw new BizException(ErrorCodes.BAD_PARAM, p.getUnit() + " 类数量须为正整数");
                }
            } else {
                qty = qty.setScale(1, RoundingMode.HALF_UP);
            }
            long line = BigDecimal.valueOf(p.getPriceFen()).multiply(qty)
                    .setScale(0, RoundingMode.HALF_UP).longValue();
            OrderItemEntity lineEntity = new OrderItemEntity();
            lineEntity.setOrderId(orderId);
            lineEntity.setProductId(p.getId());
            lineEntity.setSkuCode(p.getSkuCode());
            lineEntity.setName(p.getName());
            lineEntity.setUnit(p.getUnit());
            lineEntity.setPriceFen(p.getPriceFen());
            lineEntity.setQuantity(qty);
            lineEntity.setLineTotalFen(line);
            lines.add(lineEntity);
        }
        return lines;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> myOrders(AuthUser auth, int page, int pageSize) {
        Page<OrderEntity> p = orderRepository.findByUserIdOrderByCreatedAtDesc(
                auth.userId(), PageRequest.of(Math.max(page - 1, 0), Math.min(pageSize, 100)));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", p.getContent().stream().map(o -> toView(o, false)).toList());
        data.put("total", p.getTotalElements());
        data.put("page", page);
        data.put("pageSize", pageSize);
        return data;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMine(AuthUser auth, String id) {
        OrderEntity o = require(id);
        if (!o.getUserId().equals(auth.userId()) && auth.role() != Role.ADMIN && auth.role() != Role.SHOP) {
            throw new BizException(ErrorCodes.FORBIDDEN, "无权查看");
        }
        return toView(o, true);
    }

    @Transactional
    public Map<String, Object> cancelByCustomer(AuthUser auth, String id) {
        OrderEntity o = require(id);
        if (!o.getUserId().equals(auth.userId())) {
            throw new BizException(ErrorCodes.FORBIDDEN, "无权取消");
        }
        OrderingConfigEntity cfg = configService.getOrInit();
        ZonedDateTime now = timeSupport.now(cfg);
        if (!timeSupport.beforeCancelDeadline(cfg, now)) {
            throw new BizException(ErrorCodes.CANNOT_CANCEL, "已过取消截止时间 " + cfg.getCancelDeadline());
        }
        if (o.getStatus() != OrderStatus.PENDING_PREPARE && o.getStatus() != OrderStatus.PREPARED
                && o.getStatus() != OrderStatus.PENDING_PAY) {
            throw new BizException(ErrorCodes.BAD_STATUS, "当前状态不可取消");
        }
        if (o.isDepositPaid()) {
            // mock refund
            o.setDepositPaid(false);
        }
        o.setStatus(OrderStatus.CANCELLED);
        o.setCancelSource("CUSTOMER");
        o.setCancelReason("顾客自助取消");
        o.setCancelOperatorUserId(auth.userId());
        o.setCancelOperatorRole(auth.role().name());
        o.setCancelledAt(Instant.now());
        o.setUpdatedAt(Instant.now());
        orderRepository.save(o);
        return toView(o, true);
    }

    @Transactional
    public Map<String, Object> pay(AuthUser auth, String id) {
        OrderEntity o = requireMine(auth, id);
        if (o.getStatus() != OrderStatus.PENDING_PAY) {
            throw new BizException(ErrorCodes.BAD_STATUS, "非待支付状态");
        }
        Map<String, Object> prepay = new LinkedHashMap<>();
        prepay.put("mockTicket", "mock_" + o.getId());
        prepay.put("amountFen", o.getDepositFen());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("payMode", props.getPayMode());
        data.put("prepay", prepay);
        return data;
    }

    @Transactional
    public Map<String, Object> mockPaySuccess(AuthUser auth, String id) {
        if (!"mock".equalsIgnoreCase(props.getPayMode())) {
            throw new BizException(ErrorCodes.PAY_FAIL, "仅 mock 模式可用");
        }
        OrderEntity o = requireMine(auth, id);
        if (o.getStatus() != OrderStatus.PENDING_PAY) {
            throw new BizException(ErrorCodes.BAD_STATUS, "非待支付状态");
        }
        o.setStatus(OrderStatus.PENDING_PREPARE);
        o.setDepositPaid(true);
        o.setPickupCode(idGenerator.pickupCode());
        o.setPayExpireAt(null);
        o.setUpdatedAt(Instant.now());
        orderRepository.save(o);
        return toView(o, true);
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> createManual(AuthUser auth, Map<String, Object> body) {
        configService.requireShopOrAdmin(auth);
        OrderingConfigEntity cfg = configService.getOrInit();
        String realName = String.valueOf(body.get("realName"));
        String phone = String.valueOf(body.get("phone"));
        if (!StringUtils.hasText(realName) || !StringUtils.hasText(phone)
                || "null".equals(realName) || "null".equals(phone)) {
            throw new BizException(ErrorCodes.BAD_PARAM, "姓名手机必填");
        }
        LocalDate pickupDate = body.get("pickupDate") == null
                ? timeSupport.nextPickupDate(cfg, timeSupport.now(cfg))
                : LocalDate.parse(String.valueOf(body.get("pickupDate")));
        List<Map<String, Object>> items = (List<Map<String, Object>>) body.get("items");
        if (items == null || items.isEmpty()) {
            throw new BizException(ErrorCodes.BAD_PARAM, "items 不能为空");
        }
        OrderEntity order = new OrderEntity();
        order.setId(idGenerator.orderId());
        order.setUserId(auth.userId());
        order.setSource(OrderSource.MANUAL);
        order.setStatus(OrderStatus.PENDING_PREPARE);
        order.setPickupDate(pickupDate);
        order.setPickupSlot(requirePickupSlot(body));
        order.setSubscribeStatus(parseSubscribeAccept(body));
        order.setRemark(body.get("remark") == null ? null : String.valueOf(body.get("remark")));
        order.setCustomerRealName(realName);
        order.setCustomerPhone(phone);
        order.setPickupCode(idGenerator.pickupCode());
        order.setDepositRequired(false);
        order.setDepositFen(0);
        order.setDepositFormulaText(timeSupport.depositFormulaText(cfg));
        if (body.get("depositOffline") != null) {
            order.setDepositOffline(DepositOffline.valueOf(String.valueOf(body.get("depositOffline"))));
        } else {
            order.setDepositOffline(DepositOffline.NONE);
        }
        order.setCreatedAt(Instant.now());
        order.setUpdatedAt(Instant.now());
        List<OrderItemEntity> lines = buildLines(order.getId(), items);
        order.setTotalFen(lines.stream().mapToLong(OrderItemEntity::getLineTotalFen).sum());
        orderRepository.save(order);
        orderItemRepository.saveAll(lines);
        return toView(order, true);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> shopList(AuthUser auth, OrderSource source, LocalDate pickupDate,
                                        OrderStatus status, String pickupCode, PickupSlot pickupSlot,
                                        int page, int pageSize) {
        configService.requireShopOrAdmin(auth);
        Page<OrderEntity> p = orderRepository.searchShop(source, pickupDate, status, pickupCode, pickupSlot,
                PageRequest.of(Math.max(page - 1, 0), Math.min(pageSize, 100)));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", p.getContent().stream().map(o -> toView(o, true)).toList());
        data.put("total", p.getTotalElements());
        data.put("page", page);
        data.put("pageSize", pageSize);
        return data;
    }

    @Transactional
    public Map<String, Object> prepare(AuthUser auth, String id) {
        configService.requireShopOrAdmin(auth);
        OrderEntity o = require(id);
        if (o.getStatus() != OrderStatus.PENDING_PREPARE) {
            throw new BizException(ErrorCodes.BAD_STATUS, "仅待备货可备货");
        }
        o.setStatus(OrderStatus.PREPARED);
        onTransitionToPrepared(o);
        o.setUpdatedAt(Instant.now());
        orderRepository.save(o);
        return toView(o, true);
    }

    @Transactional
    public Map<String, Object> updateSubscribe(AuthUser auth, String id, Map<String, Object> body) {
        OrderEntity o = requireMine(auth, id);
        if (body.get("accepted") == null) {
            throw new BizException(ErrorCodes.BAD_PARAM, "accepted 必填");
        }
        boolean accepted = parseBoolean(body.get("accepted"));
        o.setSubscribeStatus(accepted ? SubscribeStatus.ACCEPTED : SubscribeStatus.NONE);
        o.setUpdatedAt(Instant.now());
        orderRepository.save(o);
        return toView(o, true);
    }

    private void onTransitionToPrepared(OrderEntity order) {
        if (order.getSubscribeStatus() != SubscribeStatus.ACCEPTED) {
            log.info("subscribe prepared skipped: orderId={}, subscribeStatus={}",
                    order.getId(), order.getSubscribeStatus());
            return;
        }
        String tmplId = props.getWx().getSubscribe().getPreparedTemplateId();
        if (!StringUtils.hasText(tmplId)) {
            order.setSubscribeStatus(SubscribeStatus.SKIPPED_NO_AUTH);
            log.info("subscribe prepared skipped: no template id, orderId={}", order.getId());
            return;
        }
        UserEntity user = userRepository.findById(order.getUserId()).orElse(null);
        if (user == null || !StringUtils.hasText(user.getOpenid())) {
            order.setSubscribeStatus(SubscribeStatus.SKIPPED_NO_AUTH);
            log.info("subscribe prepared skipped: no openid, orderId={}", order.getId());
            return;
        }
        try {
            subscribeMessageService.sendPreparedNotice(user, order, tmplId.trim());
            order.setSubscribeStatus(SubscribeStatus.SENT);
        } catch (Exception e) {
            order.setSubscribeStatus(SubscribeStatus.FAILED);
            log.warn("subscribe prepared send failed: orderId={}, err={}", order.getId(), e.toString());
        }
    }

    private PickupSlot requirePickupSlot(Map<String, Object> body) {
        if (body.get("pickupSlot") == null) {
            throw new BizException(ErrorCodes.BAD_PARAM, "pickupSlot 必填");
        }
        return parsePickupSlot(body.get("pickupSlot"));
    }

    private PickupSlot parsePickupSlot(Object raw) {
        String s = String.valueOf(raw).trim();
        if (!StringUtils.hasText(s) || "null".equalsIgnoreCase(s)) {
            throw new BizException(ErrorCodes.BAD_PARAM, "pickupSlot 无效");
        }
        try {
            return PickupSlot.valueOf(s.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BizException(ErrorCodes.BAD_PARAM, "pickupSlot 无效");
        }
    }

    private SubscribeStatus parseSubscribeAccept(Map<String, Object> body) {
        Object v = body.get("acceptSubscribePrepared");
        if (v == null) {
            return SubscribeStatus.NONE;
        }
        return parseBoolean(v) ? SubscribeStatus.ACCEPTED : SubscribeStatus.NONE;
    }

    private static boolean parseBoolean(Object v) {
        if (v instanceof Boolean b) {
            return b;
        }
        return "true".equalsIgnoreCase(String.valueOf(v).trim());
    }

    @Transactional
    public Map<String, Object> pickup(AuthUser auth, String id, String pickupCode) {
        configService.requireShopOrAdmin(auth);
        OrderEntity o = require(id);
        if (o.getStatus() != OrderStatus.PREPARED) {
            throw new BizException(ErrorCodes.BAD_STATUS, "仅已备货可取货");
        }
        if (!StringUtils.hasText(pickupCode) || !pickupCode.equals(o.getPickupCode())) {
            throw new BizException(ErrorCodes.BAD_PARAM, "取货码不正确");
        }
        o.setStatus(OrderStatus.PICKED_UP);
        o.setPickupCodeUsed(true);
        o.setUpdatedAt(Instant.now());
        orderRepository.save(o);
        return toView(o, true);
    }

    @Transactional
    public Map<String, Object> cancelByShop(AuthUser auth, String id, String reason) {
        configService.requireShopOrAdmin(auth);
        if (!StringUtils.hasText(reason) || reason.trim().length() < 1) {
            throw new BizException(ErrorCodes.BAD_PARAM, "reason 必填");
        }
        OrderEntity o = require(id);
        if (o.getStatus() != OrderStatus.PENDING_PREPARE && o.getStatus() != OrderStatus.PREPARED) {
            throw new BizException(ErrorCodes.BAD_STATUS, "当前状态不可店家取消");
        }
        // 不受 22:00 限制
        if (o.isDepositPaid()) {
            o.setDepositPaid(false); // mock refund
        }
        o.setStatus(OrderStatus.CANCELLED);
        o.setCancelSource(auth.role().name());
        o.setCancelReason(reason.trim());
        o.setCancelOperatorUserId(auth.userId());
        o.setCancelOperatorRole(auth.role().name());
        o.setCancelledAt(Instant.now());
        o.setUpdatedAt(Instant.now());
        orderRepository.save(o);
        return toView(o, true);
    }

    @Scheduled(fixedDelay = 15000)
    @Transactional
    public void closeExpired() {
        List<OrderEntity> list = orderRepository.findByStatusAndPayExpireAtBefore(
                OrderStatus.PENDING_PAY, Instant.now());
        for (OrderEntity o : list) {
            o.setStatus(OrderStatus.CLOSED);
            o.setUpdatedAt(Instant.now());
            orderRepository.save(o);
        }
    }

    private OrderEntity require(String id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new BizException(ErrorCodes.NOT_FOUND, "订单不存在"));
    }

    private OrderEntity requireMine(AuthUser auth, String id) {
        OrderEntity o = require(id);
        if (!o.getUserId().equals(auth.userId())) {
            throw new BizException(ErrorCodes.FORBIDDEN, "无权操作");
        }
        return o;
    }

    public Map<String, Object> toView(OrderEntity o, boolean withItems) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("source", o.getSource().name());
        m.put("status", o.getStatus().name());
        m.put("pickupDate", o.getPickupDate().toString());
        m.put("pickupSlot", o.getPickupSlot() == null ? null : o.getPickupSlot().name());
        m.put("subscribeStatus", o.getSubscribeStatus().name());
        m.put("totalFen", o.getTotalFen());
        m.put("depositFen", o.getDepositFen());
        m.put("depositRequired", o.isDepositRequired());
        m.put("depositFormulaText", o.getDepositFormulaText());
        m.put("payExpireAt", o.getPayExpireAt() == null ? null :
                o.getPayExpireAt().atZone(ZoneIdShanghai()).toOffsetDateTime().toString());
        m.put("payRemainSec", o.getPayExpireAt() == null ? null :
                Math.max(0, o.getPayExpireAt().getEpochSecond() - Instant.now().getEpochSecond()));
        m.put("pickupCode", o.getPickupCode());
        m.put("remark", o.getRemark());
        m.put("realName", o.getCustomerRealName());
        m.put("phone", o.getCustomerPhone());
        m.put("depositPaid", o.isDepositPaid());
        m.put("cancelSource", o.getCancelSource());
        m.put("cancelReason", o.getCancelReason());
        if (o.getDepositOffline() != null) m.put("depositOffline", o.getDepositOffline().name());
        if (withItems) {
            m.put("items", orderItemRepository.findByOrderId(o.getId()).stream().map(li -> {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put("productId", li.getProductId());
                im.put("skuCode", li.getSkuCode());
                im.put("name", li.getName());
                im.put("unit", li.getUnit());
                im.put("priceFen", li.getPriceFen());
                im.put("quantity", li.getQuantity().toPlainString());
                im.put("lineTotalFen", li.getLineTotalFen());
                return im;
            }).toList());
        }
        return m;
    }

    private java.time.ZoneId ZoneIdShanghai() {
        return java.time.ZoneId.of("Asia/Shanghai");
    }
}
