package com.yangpork.api.service;

import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Component
public class IdGenerator {
    public String userId() { return "u_" + shortUuid(); }
    public String productId() { return "prod_" + shortUuid(); }
    public String orderId() { return "ord_" + shortUuid(); }
    public String refundLedgerId() { return "rfd_" + shortUuid(); }

    public String pickupCode() {
        int n = ThreadLocalRandom.current().nextInt(100000, 1000000);
        return String.valueOf(n);
    }

    private String shortUuid() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
