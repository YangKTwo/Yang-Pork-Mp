package com.yangpork.api.domain;

/** mock 应退台账原因。取消迁入用 CANCEL，本期关单路径不写 CANCEL。 */
public enum RefundLedgerReason {
    NO_PICKUP,
    SLOT_FULL_ON_PAY,
    CANCEL
}
