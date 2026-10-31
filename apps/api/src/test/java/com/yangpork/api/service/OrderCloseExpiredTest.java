package com.yangpork.api.service;

import com.yangpork.api.common.BizException;
import com.yangpork.api.common.ErrorCodes;
import com.yangpork.api.domain.CloseReason;
import com.yangpork.api.domain.OrderEntity;
import com.yangpork.api.domain.OrderSource;
import com.yangpork.api.domain.OrderStatus;
import com.yangpork.api.domain.PickupSlot;
import com.yangpork.api.domain.RefundLedgerEntity;
import com.yangpork.api.domain.RefundLedgerReason;
import com.yangpork.api.domain.RefundLedgerStatus;
import com.yangpork.api.domain.Role;
import com.yangpork.api.domain.SubscribeStatus;
import com.yangpork.api.repo.OrderRepository;
import com.yangpork.api.repo.RefundLedgerRepository;
import com.yangpork.api.security.AuthUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:noshow;MODE=MySQL;DB_CLOSE_DELAY=-1",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "spring.task.scheduling.enabled=false"
        }
)
@Transactional
class OrderCloseExpiredTest {
    private static final ZoneId SHANGHAI = ZoneId.of("Asia/Shanghai");
    private static final LocalDate DAY = LocalDate.of(2026, 10, 30);
    private static final AuthUser CUSTOMER = new AuthUser("u_customer", Role.CUSTOMER);
    private static final AuthUser SHOP = new AuthUser("u_shop", Role.SHOP);

    @Autowired
    private OrderService orderService;
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private RefundLedgerRepository refundLedgerRepository;

    private int seq;

    @Test
    void payTimeoutSetsCloseReasonAndClosedAtWithoutLedger() {
        ZonedDateTime now = at(DAY, 15, 0, 0);
        OrderEntity expired = order(OrderStatus.PENDING_PAY, DAY.minusDays(1));
        expired.setPayExpireAt(now.minusSeconds(1).toInstant());
        expired.setDepositRequired(true);
        expired.setDepositFen(800);
        expired.setDepositPaid(false);
        orderRepository.save(expired);

        OrderEntity stillOpen = order(OrderStatus.PENDING_PAY, DAY);
        stillOpen.setPayExpireAt(now.toInstant());
        orderRepository.save(stillOpen);

        orderService.closeExpired(now);

        OrderEntity closed = reload(expired.getId());
        assertEquals(OrderStatus.CLOSED, closed.getStatus());
        assertEquals(CloseReason.PAY_TIMEOUT, closed.getCloseReason());
        assertEquals(now.toInstant(), closed.getClosedAt());
        assertEquals(false, closed.isDepositPaid());
        assertEquals(0, refundLedgerRepository.count());

        Map<String, Object> view = orderService.getMine(CUSTOMER, expired.getId());
        assertEquals("PAY_TIMEOUT", view.get("closeReason"));
        assertEquals("2026-10-30T15:00+08:00", view.get("closedAt"));
        assertNull(view.get("refundLedgerStatus"));

        assertEquals(OrderStatus.PENDING_PAY, reload(stillOpen.getId()).getStatus());
        assertNull(orderService.toView(reload(stillOpen.getId()), false).get("closeReason"));
    }

    @Test
    void noPickupClosesPastDatesAndTodayAtOrAfter2200() {
        OrderEntity yesterday = paid(order(OrderStatus.PREPARED, DAY.minusDays(1)), 2000);
        OrderEntity todayPrepared = paid(order(OrderStatus.PENDING_PREPARE, DAY), 1500);
        OrderEntity tomorrow = order(OrderStatus.PREPARED, DAY.plusDays(1));
        OrderEntity picked = order(OrderStatus.PICKED_UP, DAY.minusDays(1));
        OrderEntity cancelled = order(OrderStatus.CANCELLED, DAY.minusDays(1));
        OrderEntity unpaid = order(OrderStatus.PENDING_PAY, DAY.minusDays(1));
        unpaid.setPayExpireAt(at(DAY, 23, 0, 0).toInstant());
        unpaid.setDepositFen(900);
        unpaid.setDepositPaid(false);
        orderRepository.save(unpaid);

        orderService.closeExpired(at(DAY, 10, 0, 0));

        assertEquals(CloseReason.NO_PICKUP, reload(yesterday.getId()).getCloseReason());
        assertEquals(false, reload(yesterday.getId()).isDepositPaid());
        assertEquals(OrderStatus.PENDING_PREPARE, reload(todayPrepared.getId()).getStatus());
        assertEquals(OrderStatus.PREPARED, reload(tomorrow.getId()).getStatus());
        assertEquals(OrderStatus.PICKED_UP, reload(picked.getId()).getStatus());
        assertEquals(OrderStatus.CANCELLED, reload(cancelled.getId()).getStatus());
        assertEquals(OrderStatus.PENDING_PAY, reload(unpaid.getId()).getStatus());
        assertEquals(1, refundLedgerRepository.count());

        ZonedDateTime justBefore = at(DAY, 21, 59, 59);
        orderService.closeExpired(justBefore);
        assertEquals(OrderStatus.PENDING_PREPARE, reload(todayPrepared.getId()).getStatus());
        assertNull(reload(todayPrepared.getId()).getCloseReason());

        ZonedDateTime cutoff = at(DAY, 22, 0, 8);
        orderService.closeExpired(cutoff);

        OrderEntity closedToday = reload(todayPrepared.getId());
        assertEquals(OrderStatus.CLOSED, closedToday.getStatus());
        assertEquals(CloseReason.NO_PICKUP, closedToday.getCloseReason());
        assertEquals(cutoff.toInstant(), closedToday.getClosedAt());
        assertEquals(false, closedToday.isDepositPaid());
        assertEquals(1500, closedToday.getDepositFen());
        assertEquals(OrderStatus.PREPARED, reload(tomorrow.getId()).getStatus());
        assertEquals(OrderStatus.PENDING_PAY, reload(unpaid.getId()).getStatus());

        RefundLedgerEntity todayLedger = refundLedgerRepository.findByOrderId(todayPrepared.getId()).orElseThrow();
        assertEquals(1500, todayLedger.getAmountFen());
        assertEquals(RefundLedgerReason.NO_PICKUP, todayLedger.getReason());
        assertEquals(RefundLedgerStatus.RECORDED, todayLedger.getStatus());

        RefundLedgerEntity yesterdayLedger = refundLedgerRepository.findByOrderId(yesterday.getId()).orElseThrow();
        assertEquals(2000, yesterdayLedger.getAmountFen());

        Map<String, Object> detail = orderService.getMine(CUSTOMER, todayPrepared.getId());
        assertEquals("CLOSED", detail.get("status"));
        assertEquals("NO_PICKUP", detail.get("closeReason"));
        assertEquals("2026-10-30T22:00:08+08:00", detail.get("closedAt"));
        assertEquals(false, detail.get("depositPaid"));
        assertEquals("RECORDED", detail.get("refundLedgerStatus"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> mine = (List<Map<String, Object>>) orderService.myOrders(CUSTOMER, 1, 20).get("list");
        Map<String, Object> listed = mine.stream()
                .filter(row -> todayPrepared.getId().equals(row.get("id")))
                .findFirst()
                .orElseThrow();
        assertEquals("NO_PICKUP", listed.get("closeReason"));
        assertEquals("2026-10-30T22:00:08+08:00", listed.get("closedAt"));
        assertEquals("RECORDED", listed.get("refundLedgerStatus"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> shop = (List<Map<String, Object>>) orderService.shopList(
                SHOP, OrderSource.PREORDER, DAY, null, null, null, 1, 20).get("list");
        assertTrue(shop.stream().anyMatch(row ->
                todayPrepared.getId().equals(row.get("id"))
                        && "NO_PICKUP".equals(row.get("closeReason"))
                        && "RECORDED".equals(row.get("refundLedgerStatus"))));

        orderService.closeExpired(cutoff.plusMinutes(1));
        assertEquals(2, refundLedgerRepository.count());
    }

    @Test
    void noDepositNoPickupHasNoLedger() {
        OrderEntity order = order(OrderStatus.PREPARED, DAY.minusDays(2));
        orderService.closeExpired(at(DAY, 22, 0, 0));
        OrderEntity closed = reload(order.getId());
        assertEquals(CloseReason.NO_PICKUP, closed.getCloseReason());
        assertEquals(false, closed.isDepositPaid());
        assertEquals(0, refundLedgerRepository.count());
        assertNull(orderService.toView(closed, false).get("refundLedgerStatus"));
    }

    @Test
    void beforeCutoffPrepareAndPickupStillWork() {
        OrderEntity order = order(OrderStatus.PENDING_PREPARE, DAY);
        orderService.closeExpired(at(DAY, 21, 0, 0));
        assertEquals(OrderStatus.PENDING_PREPARE, reload(order.getId()).getStatus());

        Map<String, Object> prepared = orderService.prepare(SHOP, order.getId());
        assertEquals("PREPARED", prepared.get("status"));
        assertNull(prepared.get("closeReason"));

        Map<String, Object> picked = orderService.pickup(SHOP, order.getId(), "123456");
        assertEquals("PICKED_UP", picked.get("status"));
        assertNull(picked.get("closeReason"));
        assertNull(picked.get("closedAt"));
    }

    @Test
    void afterNoPickupClosePickupIsRejected() {
        OrderEntity order = order(OrderStatus.PREPARED, DAY);
        orderService.closeExpired(at(DAY, 22, 0, 0));
        BizException ex = assertThrows(BizException.class,
                () -> orderService.pickup(SHOP, order.getId(), "123456"));
        assertEquals(ErrorCodes.BAD_STATUS, ex.getCode());
        BizException prepareEx = assertThrows(BizException.class,
                () -> orderService.prepare(SHOP, order.getId()));
        assertEquals(ErrorCodes.BAD_STATUS, prepareEx.getCode());
    }

    @Test
    void slotFullOnPayCloseRecordsLedgerWithoutTouchingPayFlow() {
        OrderEntity order = paid(order(OrderStatus.PENDING_PAY, DAY), 2400);
        Instant closedAt = at(DAY, 18, 30, 0).toInstant();
        orderService.closeWithReason(order, CloseReason.SLOT_FULL_ON_PAY, closedAt);

        OrderEntity closed = reload(order.getId());
        assertEquals(OrderStatus.CLOSED, closed.getStatus());
        assertEquals(CloseReason.SLOT_FULL_ON_PAY, closed.getCloseReason());
        assertEquals(closedAt, closed.getClosedAt());
        assertEquals(false, closed.isDepositPaid());
        RefundLedgerEntity ledger = refundLedgerRepository.findByOrderId(order.getId()).orElseThrow();
        assertEquals(2400, ledger.getAmountFen());
        assertEquals(RefundLedgerReason.SLOT_FULL_ON_PAY, ledger.getReason());
        assertEquals(RefundLedgerStatus.RECORDED, ledger.getStatus());
        assertEquals("SLOT_FULL_ON_PAY", orderService.toView(closed, true).get("closeReason"));
    }

    @Test
    void scheduledEntryClosesPayTimeoutAndPastPickup() {
        OrderEntity expiredPay = order(OrderStatus.PENDING_PAY, DAY);
        expiredPay.setPayExpireAt(Instant.now().minusSeconds(5));
        orderRepository.save(expiredPay);
        OrderEntity missed = order(OrderStatus.PENDING_PREPARE, LocalDate.now(SHANGHAI).minusDays(1));

        orderService.closeExpired();

        assertEquals(CloseReason.PAY_TIMEOUT, reload(expiredPay.getId()).getCloseReason());
        assertEquals(CloseReason.NO_PICKUP, reload(missed.getId()).getCloseReason());
    }

    private OrderEntity paid(OrderEntity order, long depositFen) {
        order.setDepositRequired(true);
        order.setDepositFen(depositFen);
        order.setDepositPaid(true);
        return orderRepository.save(order);
    }

    private OrderEntity order(OrderStatus status, LocalDate pickupDate) {
        OrderEntity order = new OrderEntity();
        order.setId("ord_n" + (++seq));
        order.setUserId(CUSTOMER.userId());
        order.setSource(OrderSource.PREORDER);
        order.setStatus(status);
        order.setPickupDate(pickupDate);
        order.setPickupSlot(PickupSlot.NOON);
        order.setSubscribeStatus(SubscribeStatus.NONE);
        order.setTotalFen(8000);
        order.setDepositFen(0);
        order.setDepositRequired(false);
        order.setDepositPaid(false);
        order.setPickupCode("123456");
        order.setCreatedAt(Instant.parse("2026-10-29T02:00:00Z"));
        order.setUpdatedAt(Instant.parse("2026-10-29T02:00:00Z"));
        return orderRepository.save(order);
    }

    private OrderEntity reload(String id) {
        return orderRepository.findById(id).orElseThrow();
    }

    private static ZonedDateTime at(LocalDate date, int hour, int minute, int second) {
        return ZonedDateTime.of(date, LocalTime.of(hour, minute, second), SHANGHAI);
    }
}
