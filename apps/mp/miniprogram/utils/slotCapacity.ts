/** F-SLOT-02：时段容量 Toast / 40013 / T24 */
import { isApiBizError } from './apiEnvelope'
import {
  pickupSlotTrackValue,
  type PickupSlot,
  type PickupSlotMeta,
} from './pickupSlot'
import { track, TrackEvents } from './tracking/index'

/** DA 常量 · 对应 T24 事件名 TrackEvents.PICKUP_SLOT_FULL */
export const PICKUP_SLOT_FULL = TrackEvents.PICKUP_SLOT_FULL

export const SLOT_FULL_BIZ_CODE = 40013

export const SLOT_FULL_TOAST = '该时段已约满'

/** T24 source：confirm=点选已满档；submit=提交被拒；pay=支付满档；manual=代录 */
export type PickupSlotFullSource = 'confirm' | 'submit' | 'pay' | 'manual'

export function isSlotFullBizError(e: unknown): boolean {
  return isApiBizError(e) && e.code === SLOT_FULL_BIZ_CODE
}

export function slotFullUserMessage(e?: unknown): string {
  if (isSlotFullBizError(e) && e.message) return e.message
  return SLOT_FULL_TOAST
}

export function trackPickupSlotFull(params: {
  source: PickupSlotFullSource
  pickup_slot: PickupSlot | string | null | undefined
  pickup_date: string
  slotMeta?: PickupSlotMeta | null
}): void {
  track(
    PICKUP_SLOT_FULL,
    {
      pickup_slot: pickupSlotTrackValue(params.pickup_slot),
      pickup_date: params.pickup_date,
      fail_reason: 'slot_full',
      biz_code: SLOT_FULL_BIZ_CODE,
      source: params.source,
      ...slotCapacityTrackProps(params.slotMeta),
    },
    'T24'
  )
}

/** Toast「该时段已约满」并上报 T24（满档路径勿再打 T09 pay_mock_fail） */
export function showPickupSlotFullFeedback(params: {
  source: PickupSlotFullSource
  pickup_slot: PickupSlot | string | null | undefined
  pickup_date: string
  message?: string
  slotMeta?: PickupSlotMeta | null
}): void {
  wx.showToast({
    title: params.message || SLOT_FULL_TOAST,
    icon: 'none',
  })
  trackPickupSlotFull(params)
}

export function slotCapacityTrackProps(
  meta: PickupSlotMeta | undefined | null
): Record<string, number | boolean> {
  if (!meta || meta.capacity === undefined) return {}
  return {
    slot_capacity: meta.capacity,
    slot_remaining: meta.remaining ?? 0,
    slot_full: !!meta.full,
  }
}

export function findSlotMeta(
  slots: PickupSlotMeta[],
  code: PickupSlot | string | null | undefined
): PickupSlotMeta | undefined {
  if (!code) return undefined
  return slots.find((s) => s.code === code)
}
