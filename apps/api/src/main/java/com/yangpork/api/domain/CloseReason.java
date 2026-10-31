package com.yangpork.api.domain;

/**
 * 仅 status=CLOSED 时有意义。取消走 cancelReason，不复用本枚举。
 */
public enum CloseReason {
    /** 待支付超时未付 */
    PAY_TIMEOUT,
    /** 取货日当天 22:00 后仍未取 */
    NO_PICKUP,
    /** 支付成功时时段已满，无法进入备货（容量校验写入） */
    SLOT_FULL_ON_PAY
}
