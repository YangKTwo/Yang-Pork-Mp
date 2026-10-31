/** F-NOSHOW-01 / 关单原因展示；与 BE `closeReason` 契约一致 */
import { statusLabel } from './money'
import { track, TrackEvents } from './tracking/index'

export type OrderCloseReason = 'PAY_TIMEOUT' | 'NO_PICKUP' | 'SLOT_FULL_ON_PAY'

type OrderStatusInput = {
  status: string
  closeReason?: OrderCloseReason | string | null
}

const SLOT_FULL_CLOSED_NOTE = '时段已约满'

/** 列表 Tag：CLOSED 按 closeReason；其余走 statusLabel */
export function orderStatusDisplayText(order: OrderStatusInput): string {
  if (order.status !== 'CLOSED') {
    return statusLabel(order.status)
  }
  switch (order.closeReason) {
    case 'NO_PICKUP':
      return '超时未取'
    case 'SLOT_FULL_ON_PAY':
      return SLOT_FULL_CLOSED_NOTE
    case 'PAY_TIMEOUT':
    default:
      return statusLabel('CLOSED')
  }
}

/** 详情顶栏状态 Tag（NO_PICKUP 直出「超时未取」；其余 CLOSED 为「已关闭」） */
export function orderDetailStatusTag(order: OrderStatusInput): string {
  if (order.status !== 'CLOSED') {
    return statusLabel(order.status)
  }
  if (order.closeReason === 'NO_PICKUP') {
    return '超时未取'
  }
  return statusLabel('CLOSED')
}

/** 详情关单短说明（SLOT_FULL 短文案，非 Toast 长句） */
export function orderClosedDetailNote(order: OrderStatusInput): string {
  if (order.status !== 'CLOSED') return ''
  if (order.closeReason === 'SLOT_FULL_ON_PAY') {
    return SLOT_FULL_CLOSED_NOTE
  }
  return ''
}

/** 列表状态筛选：「超时未取」与「已关闭」互斥独立（C-LIST / 工作台状态筛选用） */
export type OrderListStatusFilter =
  | 'all'
  | 'pending_pay'
  | 'pending_pickup'
  | 'completed'
  | 'closed'
  | 'no_pickup'

export function orderMatchesListStatusFilter(
  order: OrderStatusInput,
  filter: OrderListStatusFilter
): boolean {
  if (filter === 'all') return true
  if (filter === 'no_pickup') return isNoPickupClosed(order)
  if (filter === 'closed') {
    return order.status === 'CLOSED' && !isNoPickupClosed(order)
  }
  if (filter === 'pending_pay') return order.status === 'PENDING_PAY'
  if (filter === 'pending_pickup') {
    return order.status === 'PENDING_PREPARE' || order.status === 'PREPARED'
  }
  if (filter === 'completed') {
    return order.status === 'PICKED_UP' || order.status === 'CANCELLED'
  }
  return true
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
