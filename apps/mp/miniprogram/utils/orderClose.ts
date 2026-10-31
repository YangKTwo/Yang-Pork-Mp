/** F-NOSHOW-01 / 关单原因展示；与 BE `closeReason` 契约一致 */
import { statusLabel } from './money'
import { track, TrackEvents } from './tracking/index'

export type OrderCloseReason = 'PAY_TIMEOUT' | 'NO_PICKUP' | 'SLOT_FULL_ON_PAY'

type OrderStatusInput = {
  status: string
  closeReason?: OrderCloseReason | string | null
}

/** 列表/详情 Tag 文案：CLOSED 按 closeReason；其余走 statusLabel */
export function orderStatusDisplayText(order: OrderStatusInput): string {
  if (order.status !== 'CLOSED') {
    return statusLabel(order.status)
  }
  switch (order.closeReason) {
    case 'NO_PICKUP':
      return '超时未取'
    case 'SLOT_FULL_ON_PAY':
      return '该时段已约满'
    case 'PAY_TIMEOUT':
    default:
      return statusLabel('CLOSED')
  }
}

export function isNoPickupClosed(order: OrderStatusInput): boolean {
  return order.status === 'CLOSED' && order.closeReason === 'NO_PICKUP'
}

const T25_STORAGE_KEY = 'TRACK_ORDER_CLOSED_NO_PICKUP'
const t25SeenSession = new Set<string>()

/** T25：详情首次展示「超时未取」时上报一次；与 T13 支付超时分离 */
export function trackOrderClosedNoPickupOnce(orderId: string): void {
  if (!orderId) return
  if (t25SeenSession.has(orderId)) return
  try {
    const seen: Record<string, boolean> = wx.getStorageSync(T25_STORAGE_KEY) || {}
    if (seen[orderId]) {
      t25SeenSession.add(orderId)
      return
    }
    seen[orderId] = true
    wx.setStorageSync(T25_STORAGE_KEY, seen)
  } catch (_e) {
    /* 持久化失败仍保证本会话只打一次 */
  }
  t25SeenSession.add(orderId)
  track(
    TrackEvents.ORDER_CLOSED_NO_PICKUP,
    { order_id: orderId, close_reason: 'NO_PICKUP' },
    'T25'
  )
}
