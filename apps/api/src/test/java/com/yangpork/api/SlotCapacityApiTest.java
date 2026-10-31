package com.yangpork.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yangpork.api.domain.RefundLedgerReason;
import com.yangpork.api.domain.RefundLedgerStatus;
import com.yangpork.api.repo.RefundLedgerRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import java.nio.charset.StandardCharsets;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:slotcap;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.task.scheduling.enabled=false"
})
class SlotCapacityApiTest {
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("HH:mm");

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper json;
    @Autowired
    private RefundLedgerRepository refundLedgerRepository;

    @Test
    void slotCapacityRejectsFullAndClosesDepositPay() throws Exception {
        String admin = login("admin-slot", "管理员", "13800000001");
        String shop = login("shop-slot", "店员", "13800000002");
        String c1 = login("cust-slot-1", "顾客甲", "13600000011");
        String c2 = login("cust-slot-2", "顾客乙", "13600000012");

        widenWindow(admin);
        String productId = productId(c1, "P03");

        JsonNode ordering = data(getJson(c1, "/api/v1/config/ordering"));
        assertEquals(ordering.get("nextPickupDate").asText(), ordering.get("pickupDateForSlots").asText());
        assertEquals("上午取", slot(ordering, "MORNING").get("label").asText());
        assertEquals("08:00–11:00", slot(ordering, "MORNING").get("hint").asText());
        assertEquals("", ordering.get("subscribePreparedTmplId").asText());
        assertEquals(30, ordering.get("defaultSlotCapacity").get("MORNING").asInt());
        assertEquals(30, ordering.get("defaultSlotCapacity").get("NOON").asInt());
        assertEquals(30, ordering.get("defaultSlotCapacity").get("EVENING").asInt());
        assertEquals(30, slot(ordering, "MORNING").get("capacity").asInt());
        assertEquals(0, slot(ordering, "MORNING").get("occupied").asInt());
        assertFalse(slot(ordering, "MORNING").get("full").asBoolean());
        String nextDate = ordering.get("nextPickupDate").asText();

        Map<String, Object> evening = new LinkedHashMap<>();
        evening.put("EVENING", 40);
        data(putJson(admin, "/api/v1/admin/config/ordering", Map.of("defaultSlotCapacity", evening)));
        JsonNode afterDefault = data(getJson(c1, "/api/v1/config/ordering"));
        assertEquals(40, afterDefault.get("defaultSlotCapacity").get("EVENING").asInt());
        assertEquals(30, afterDefault.get("defaultSlotCapacity").get("MORNING").asInt());

        JsonNode badDefault = root(putJson(admin, "/api/v1/admin/config/ordering",
                Map.of("defaultSlotCapacity", Map.of("MORNING", 0))));
        assertEquals(40001, badDefault.get("code").asInt());
        JsonNode fraction = root(putJson(admin, "/api/v1/admin/config/ordering",
                Map.of("defaultSlotCapacity", Map.of("NOON", 1.5))));
        assertEquals(40001, fraction.get("code").asInt());
        JsonNode still = data(getJson(admin, "/api/v1/config/ordering"));
        assertEquals(30, still.get("defaultSlotCapacity").get("MORNING").asInt());
        assertEquals(30, still.get("defaultSlotCapacity").get("NOON").asInt());
        assertEquals(40, still.get("defaultSlotCapacity").get("EVENING").asInt());

        mvc.perform(put("/api/v1/admin/config/slot-capacity")
                        .header("Authorization", "Bearer " + shop)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pickupDate\":\"" + nextDate + "\",\"capacities\":{\"MORNING\":1}}"))
                .andExpect(status().isForbidden());

        JsonNode missingDate = root(getJson(admin, "/api/v1/admin/config/slot-capacity"));
        assertEquals(40001, missingDate.get("code").asInt());
        JsonNode badDate = root(getJson(c1, "/api/v1/config/ordering?pickupDate=2026/11/01"));
        assertEquals(40001, badDate.get("code").asInt());

        Map<String, Object> morningCap = new LinkedHashMap<>();
        morningCap.put("MORNING", 1);
        JsonNode override = data(putJson(admin, "/api/v1/admin/config/slot-capacity", Map.of(
                "pickupDate", nextDate,
                "capacities", morningCap)));
        assertEquals(1, override.get("overrides").get("MORNING").asInt());
        assertFalse(override.get("overrides").has("NOON"));
        assertEquals(1, override.get("effective").get("MORNING").get("capacity").asInt());
        assertEquals(30, override.get("effective").get("NOON").get("capacity").asInt());

        JsonNode created = data(postJson(c1, "/api/v1/orders", preorder(productId, 0.5, "MORNING")));
        assertEquals("PENDING_PREPARE", created.get("status").asText());
        assertEquals("MORNING", created.get("pickupSlot").asText());
        assertEquals("NONE", created.get("subscribeStatus").asText());
        assertTrue(created.get("closeReason").isNull());
        String occupyId = created.get("id").asText();
        String occupyCode = created.get("pickupCode").asText();

        JsonNode fullView = data(getJson(c1, "/api/v1/config/ordering?pickupDate=" + nextDate));
        assertEquals(nextDate, fullView.get("pickupDateForSlots").asText());
        assertEquals(1, slot(fullView, "MORNING").get("occupied").asInt());
        assertEquals(0, slot(fullView, "MORNING").get("remaining").asInt());
        assertTrue(slot(fullView, "MORNING").get("full").asBoolean());

        MvcResult rejectedResult = postJson(c2, "/api/v1/orders", preorder(productId, 0.5, "MORNING"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode rejected = json.readTree(rejectedResult.getResponse().getContentAsString(StandardCharsets.UTF_8));
        assertEquals(40013, rejected.get("code").asInt());
        assertEquals("该时段已约满", rejected.get("message").asText());
        assertTrue(rejected.get("data").isNull());

        JsonNode manualRejected = root(postJson(shop, "/api/v1/shop/orders/manual", manual(productId, nextDate, "MORNING")));
        assertEquals(40013, manualRejected.get("code").asInt());

        JsonNode prepared = data(postJson(shop, "/api/v1/shop/orders/" + occupyId + "/prepare", Map.of()));
        assertEquals("PREPARED", prepared.get("status").asText());
        JsonNode stillFull = data(getJson(shop, "/api/v1/config/ordering?pickupDate=" + nextDate));
        assertEquals(1, slot(stillFull, "MORNING").get("occupied").asInt());
        assertTrue(slot(stillFull, "MORNING").get("full").asBoolean());

        JsonNode pendingPay = data(postJson(c2, "/api/v1/orders", preorder(productId, 1, "MORNING")));
        assertEquals("PENDING_PAY", pendingPay.get("status").asText());
        assertTrue(pendingPay.get("depositFen").asLong() > 0);
        assertFalse(pendingPay.get("depositPaid").asBoolean());
        String pendingId = pendingPay.get("id").asText();
        JsonNode pendingNotOccupy = data(getJson(c2, "/api/v1/config/ordering?pickupDate=" + nextDate));
        assertEquals(1, slot(pendingNotOccupy, "MORNING").get("occupied").asInt());

        MvcResult payResult = postJson(c2, "/api/v1/orders/" + pendingId + "/pay/mock-success", Map.of())
                .andExpect(status().isOk())
                .andReturn();
        JsonNode payErr = json.readTree(payResult.getResponse().getContentAsString(StandardCharsets.UTF_8));
        assertEquals(40013, payErr.get("code").asInt());
        assertEquals("该时段已约满", payErr.get("message").asText());

        JsonNode closed = data(getJson(c2, "/api/v1/orders/" + pendingId));
        assertEquals("CLOSED", closed.get("status").asText());
        assertEquals("SLOT_FULL_ON_PAY", closed.get("closeReason").asText());
        assertFalse(closed.get("depositPaid").asBoolean());
        assertEquals("RECORDED", closed.get("refundLedgerStatus").asText());
        assertTrue(closed.get("closedAt").asText().contains("+08:00"));
        var ledger = refundLedgerRepository.findByOrderId(pendingId).orElseThrow();
        assertEquals(closed.get("depositFen").asLong(), ledger.getAmountFen());
        assertEquals(RefundLedgerReason.SLOT_FULL_ON_PAY, ledger.getReason());
        assertEquals(RefundLedgerStatus.RECORDED, ledger.getStatus());

        JsonNode retry = root(postJson(c2, "/api/v1/orders/" + pendingId + "/pay/mock-success", Map.of()));
        assertEquals(40012, retry.get("code").asInt());

        JsonNode mine = data(getJson(c2, "/api/v1/orders"));
        boolean listed = false;
        for (JsonNode row : mine.get("list")) {
            if (pendingId.equals(row.get("id").asText())) {
                assertEquals("SLOT_FULL_ON_PAY", row.get("closeReason").asText());
                assertEquals("RECORDED", row.get("refundLedgerStatus").asText());
                listed = true;
            }
        }
        assertTrue(listed);
        JsonNode afterClose = data(getJson(c1, "/api/v1/config/ordering?pickupDate=" + nextDate));
        assertEquals(1, slot(afterClose, "MORNING").get("occupied").asInt());

        JsonNode picked = data(postJson(shop, "/api/v1/shop/orders/" + occupyId + "/pickup",
                Map.of("pickupCode", occupyCode)));
        assertEquals("PICKED_UP", picked.get("status").asText());
        JsonNode released = data(getJson(c1, "/api/v1/config/ordering?pickupDate=" + nextDate));
        assertEquals(0, slot(released, "MORNING").get("occupied").asInt());
        assertEquals(1, slot(released, "MORNING").get("remaining").asInt());
        assertFalse(slot(released, "MORNING").get("full").asBoolean());

        JsonNode noonPending = data(postJson(c2, "/api/v1/orders", preorder(productId, 1, "NOON")));
        assertEquals("PENDING_PAY", noonPending.get("status").asText());
        JsonNode noonBeforePay = data(getJson(c2, "/api/v1/config/ordering?pickupDate=" + nextDate));
        assertEquals(0, slot(noonBeforePay, "NOON").get("occupied").asInt());
        assertFalse(slot(noonBeforePay, "NOON").get("full").asBoolean());
        JsonNode noonPaid = data(postJson(c2, "/api/v1/orders/" + noonPending.get("id").asText() + "/pay/mock-success", Map.of()));
        assertEquals("PENDING_PREPARE", noonPaid.get("status").asText());
        assertTrue(noonPaid.get("depositPaid").asBoolean());
        assertTrue(noonPaid.get("closeReason").isNull());
        assertNotNull(noonPaid.get("pickupCode").asText());
        JsonNode noonAfter = data(getJson(c1, "/api/v1/config/ordering?pickupDate=" + nextDate));
        assertEquals(1, slot(noonAfter, "NOON").get("occupied").asInt());

        String day = "2099-01-01";
        Map<String, Object> caps = new LinkedHashMap<>();
        caps.put("MORNING", 5);
        caps.put("NOON", 6);
        caps.put("EVENING", 0);
        data(putJson(admin, "/api/v1/admin/config/slot-capacity", Map.of("pickupDate", day, "capacities", caps)));
        Map<String, Object> dropMorning = new LinkedHashMap<>();
        dropMorning.put("MORNING", null);
        JsonNode dropped = data(putJson(admin, "/api/v1/admin/config/slot-capacity", Map.of(
                "pickupDate", day, "capacities", dropMorning)));
        assertFalse(dropped.get("overrides").has("MORNING"));
        assertEquals(6, dropped.get("overrides").get("NOON").asInt());
        assertEquals(0, dropped.get("effective").get("EVENING").get("capacity").asInt());
        assertTrue(dropped.get("effective").get("EVENING").get("full").asBoolean());
        assertEquals(0, dropped.get("effective").get("EVENING").get("remaining").asInt());
        JsonNode zeroRejected = root(postJson(shop, "/api/v1/shop/orders/manual", manual(productId, day, "EVENING")));
        assertEquals(40013, zeroRejected.get("code").asInt());

        JsonNode cleared = data(putJson(admin, "/api/v1/admin/config/slot-capacity", Map.of(
                "pickupDate", day,
                "capacities", Map.of(),
                "clearAll", true)));
        assertEquals(0, cleared.get("overrides").size());
        assertEquals(40, cleared.get("effective").get("EVENING").get("capacity").asInt());
        assertFalse(cleared.get("effective").get("EVENING").get("full").asBoolean());
        JsonNode manualOk = data(postJson(shop, "/api/v1/shop/orders/manual", manual(productId, day, "EVENING")));
        assertEquals("PENDING_PREPARE", manualOk.get("status").asText());
        assertEquals("EVENING", manualOk.get("pickupSlot").asText());
    }

    private void widenWindow(String admin) throws Exception {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Shanghai"));
        LocalTime t = now.toLocalTime();
        LocalTime start = t.minusMinutes(2).withSecond(0).withNano(0);
        LocalTime end = t.plusMinutes(2).withSecond(0).withNano(0);
        if (!end.isAfter(start)) {
            start = LocalTime.MIDNIGHT;
            end = LocalTime.of(23, 59);
        }
        JsonNode updated = data(putJson(admin, "/api/v1/admin/config/ordering", Map.of(
                "orderWindowStart", start.format(HM),
                "orderWindowEnd", end.format(HM))));
        assertTrue(updated.get("canOrderNow").asBoolean(), updated.toString());
    }

    private String login(String devKey, String name, String phone) throws Exception {
        JsonNode logged = data(mvc.perform(post("/api/v1/auth/wx-login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"devKey\":\"" + devKey + "\"}")));
        JsonNode profile = data(mvc.perform(post("/api/v1/auth/profile")
                .header("Authorization", "Bearer " + logged.get("accessToken").asText())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"realName\":\"" + name + "\",\"phone\":\"" + phone + "\"}")));
        return profile.get("accessToken").asText();
    }

    private String productId(String token, String sku) throws Exception {
        JsonNode list = data(getJson(token, "/api/v1/products"));
        for (JsonNode p : list) {
            if (sku.equals(p.get("skuCode").asText())) {
                return p.get("id").asText();
            }
        }
        throw new AssertionError("missing sku " + sku);
    }

    private Map<String, Object> preorder(String productId, double qty, String slot) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("productId", productId);
        item.put("quantity", qty);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", List.of(item));
        body.put("pickupSlot", slot);
        return body;
    }

    private Map<String, Object> manual(String productId, String date, String slot) {
        Map<String, Object> body = preorder(productId, 0.5, slot);
        body.put("realName", "到店客");
        body.put("phone", "13700001111");
        body.put("pickupDate", date);
        return body;
    }

    private JsonNode slot(JsonNode ordering, String code) {
        for (JsonNode s : ordering.get("pickupSlots")) {
            if (code.equals(s.get("code").asText())) {
                return s;
            }
        }
        throw new AssertionError("missing slot " + code);
    }

    private ResultActions getJson(String token, String path) throws Exception {
        return mvc.perform(get(path).header("Authorization", "Bearer " + token));
    }

    private ResultActions postJson(String token, String path, Map<String, Object> body) throws Exception {
        return mvc.perform(post(path)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)));
    }

    private ResultActions putJson(String token, String path, Map<String, Object> body) throws Exception {
        return mvc.perform(put(path)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)));
    }

    private JsonNode data(ResultActions actions) throws Exception {
        JsonNode root = root(actions);
        assertEquals(0, root.path("code").asInt(), root.toString());
        return root.get("data");
    }

    private JsonNode root(ResultActions actions) throws Exception {
        MvcResult result = actions.andReturn();
        String raw = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        return json.readTree(raw);
    }
}
