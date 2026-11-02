/** 与 docs/08_TRACKING_MP_FUNNEL.md 事件名一一对应；禁止业务散落魔法字符串 */
export const TrackEvents = {
  LOGIN_WX: 'login_wx',
  PROFILE_SUBMIT: 'profile_submit',
  PRODUCT_LIST_VIEW: 'product_list_view',
  PRODUCT_ADD_DRAWER_OPEN: 'product_add_drawer_open',
  CART_ADD: 'cart_add',
  ORDER_CONFIRM_VIEW: 'order_confirm_view',
  ORDER_SUBMIT: 'order_submit',
  PAY_PAGE_VIEW: 'pay_page_view',
  PAY_MOCK_SUCCESS: 'pay_mock_success',
  ORDER_DETAIL_VIEW: 'order_detail_view',
  PICKUP_VERIFY_SUCCESS: 'pickup_verify_success',
  // P1
  PAY_MOCK_FAIL: 'pay_mock_fail',
  ORDER_CLOSED_TIMEOUT: 'order_closed_timeout',
  ORDER_CLOSED_NO_PICKUP: 'order_closed_no_pickup',
  ORDER_CANCEL: 'order_cancel',
  SHOP_PREPARE: 'shop_prepare',
  PICKUP_VERIFY_FAIL: 'pickup_verify_fail',
  SHOP_CANCEL: 'shop_cancel',
  MANUAL_ORDER_CREATE: 'manual_order_create',
  API_ERROR: 'api_error',
  ORDER_WINDOW_BLOCK: 'order_window_block',
  SUBSCRIBE_AUTH_PROMPT: 'subscribe_auth_prompt',
  SUBSCRIBE_AUTH_RESULT: 'subscribe_auth_result',
  /** F-SLOT-02 · T24 */
  PICKUP_SLOT_FULL: 'pickup_slot_full',
} as const

export type TrackEventName = (typeof TrackEvents)[keyof typeof TrackEvents]
