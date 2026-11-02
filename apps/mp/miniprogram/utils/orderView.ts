/** 页面展示映射。只格式化文案和 Tag，不发请求。 */
import { fenToYuan, lineItemYuan } from './money'
import { formatPickupSlotDisplay, pickupSlotLabel, type PickupSlotMeta } from './pickupSlot'
import { orderStatusDisplayText } from './orderClose'
import { isSubscribeReminderActive, subscribeReminderCopy } from './subscribeReady'

type OrderLike = {
  id: string
  status: string
  closeReason?: string | null
  pickupDate?: string | null
  pickupSlot?: string | null
  pickupCode?: string | null
  totalFen?: number
  items?: { name: string; quantity: string | number; unit?: string }[]
  subscribeStatus?: string | null
  realName?: string | null
  phone?: string | null
  remark?: string | null
  source?: string
  depositRequired?: boolean
  depositFen?: number
  depositOffline?: string | null
}

export function readField(e: { detail?: unknown }): string {
  const detail = e && e.detail
  if (detail && typeof detail === 'object' && 'value' in detail) {
    const value = (detail as { value?: unknown }).value
    return value == null ? '' : String(value)
  }
  return detail == null ? '' : String(detail)
}

export function readSlotPick(e: {
  detail?: { slot?: string; full?: boolean }
  currentTarget?: { dataset?: { slot?: string; full?: boolean | string } }
}): { slot: string; full: boolean } {
  const detail = (e && e.detail) || {}
  const dataset = (e && e.currentTarget && e.currentTarget.dataset) || {}
  const slot = String(detail.slot || dataset.slot || '')
  const rawFull = detail.full != null ? detail.full : dataset.full
  return { slot, full: rawFull === true || rawFull === 'true' }
}

/** Vant Tag type。满档关闭用 danger，超时未取用 warning。 */
export function statusTagType(status: string, closeReason?: string | null): string {
  if (status === 'CLOSED' && closeReason === 'NO_PICKUP') return 'warning'
  if (status === 'CLOSED' && closeReason === 'SLOT_FULL_ON_PAY') return 'danger'
  switch (status) {
    case 'PENDING_PAY':
      return 'warning'
    case 'PREPARED':
    case 'PICKED_UP':
    case 'ON_SHELF':
      return 'success'
    case 'CANCELLED':
    case 'CLOSED':
    case 'OFF_SHELF':
      return 'default'
    default:
      return 'primary'
  }
}

export function sourceLabel(source?: string | null): string {
  return source === 'MANUAL' ? '代录' : '预定'
}

export function shelfLabel(status?: string | null): string {
  return status === 'ON_SHELF' ? '上架' : '下架'
}

export function orderItemSummary(
  items?: { name: string; quantity: string | number; unit?: string }[]
): string {
  if (!items || !items.length) return '订单'
  return items.map((item) => `${item.name}×${item.quantity}${item.unit || ''}`).join('、')
}

export function withLineYuan<T extends { lineFen?: number; lineTotalFen?: number }>(items: T[] | undefined) {
  return (items || []).map((item) => ({ ...item, lineYuan: lineItemYuan(item) }))
}

export function customerDepositText(order: {
  depositRequired?: boolean
  status: string
  depositFen?: number
}): string {
  if (!order.depositRequired) return '免定金'
  const yuan = fenToYuan(order.depositFen)
  return order.status === 'PENDING_PAY' ? `待付 ¥${yuan}` : `已付 ¥${yuan}`
}

export function shopDepositText(order: {
  source?: string
  depositOffline?: string | null
  depositRequired?: boolean
  depositFen?: number
}): string {
  if (order.source === 'MANUAL') return order.depositOffline || '线下'
  if (order.depositRequired) return `已付 ¥${fenToYuan(order.depositFen)}`
  return '免定金'
}

export function mapCustomerOrderCard(order: OrderLike, slotMeta: PickupSlotMeta[]) {
  const subscribeStatus = (order.subscribeStatus || undefined) as SubscribeStatus | undefined
  const reminderOn = isSubscribeReminderActive(subscribeStatus)
  const copy = subscribeReminderCopy(subscribeStatus)
  return {
    id: order.id,
    statusText: orderStatusDisplayText(order),
    statusTagType: statusTagType(order.status, order.closeReason),
    pickupDate: order.pickupDate,
    pickupSlotText: formatPickupSlotDisplay(order.pickupDate, order.pickupSlot, slotMeta),
    totalYuan: fenToYuan(order.totalFen),
    pickupCode: order.pickupCode,
    summary: orderItemSummary(order.items),
    subscribeReminderOn: reminderOn,
    subscribeBadge: copy.badge,
  }
}

export function mapShopOrderCard(order: OrderLike, slotMeta: PickupSlotMeta[]) {
  return {
    id: order.id,
    statusText: orderStatusDisplayText(order),
    statusTagType: statusTagType(order.status, order.closeReason),
    pickupCode: order.pickupCode,
    pickupSlotText: formatPickupSlotDisplay(order.pickupDate, order.pickupSlot, slotMeta),
    pickupSlotLabel: pickupSlotLabel(order.pickupSlot, slotMeta),
    realName: order.realName || '—',
    phone: order.phone || '—',
    totalYuan: fenToYuan(order.totalFen),
    summary: orderItemSummary(order.items),
    remark: (order.remark || '').trim(),
  }
}

export function mapProductRow<T extends { priceFen: number; status?: string }>(product: T) {
  return {
    ...product,
    priceYuan: fenToYuan(product.priceFen),
    shelfText: shelfLabel(product.status),
    shelfTagType: statusTagType(product.status || ''),
  }
}
