/** A-CFG-02 · T26/T27 超管时段容量埋点（§3.5） */
import { isApiBizError } from './apiEnvelope'
import type { PickupSlot } from './pickupSlot'
import { track, TrackEvents } from './tracking/index'

export type AdminSlotCapacitySaveScope = 'default' | 'day' | 'clear_all'

export function capPropsFromInts(caps: Partial<Record<PickupSlot, number>>): Record<string, number> {
  const out: Record<string, number> = {}
  if (caps.MORNING !== undefined) out.cap_morning = caps.MORNING
  if (caps.NOON !== undefined) out.cap_noon = caps.NOON
  if (caps.EVENING !== undefined) out.cap_evening = caps.EVENING
  return out
}

export function capPropsFromDayCapacities(
  capacities: Partial<Record<PickupSlot, number | null>>
): Record<string, number> {
  const ints: Partial<Record<PickupSlot, number>> = {}
  const slots: PickupSlot[] = ['MORNING', 'NOON', 'EVENING']
  for (const slot of slots) {
    const v = capacities[slot]
    if (typeof v === 'number') ints[slot] = v
  }
  return capPropsFromInts(ints)
}

/** T26 · P1 可选 */
export function trackAdminSlotCapacityView(entry?: string): void {
  track(TrackEvents.ADMIN_SLOT_CAPACITY_VIEW, entry ? { entry } : {}, 'T26')
}

/** T27 · P0 */
export function trackAdminSlotCapacitySave(params: {
  result: 'success' | 'fail'
  scope: AdminSlotCapacitySaveScope
  pickup_date?: string
  caps?: Partial<Record<PickupSlot, number>>
  capacities?: Partial<Record<PickupSlot, number | null>>
  error?: unknown
  fail_reason?: string
}): void {
  const props: Record<string, unknown> = {
    result: params.result,
    scope: params.scope,
  }
  if (params.scope === 'day' || params.scope === 'clear_all') {
    if (params.pickup_date) props.pickup_date = params.pickup_date
  }
  if (params.caps) {
    Object.assign(props, capPropsFromInts(params.caps))
  } else if (params.capacities) {
    Object.assign(props, capPropsFromDayCapacities(params.capacities))
  }
  if (params.result === 'fail') {
    if (params.fail_reason) props.fail_reason = params.fail_reason
    const e = params.error
    if (isApiBizError(e)) {
      props.biz_code = e.code
      if (!params.fail_reason && e.message) props.fail_reason = e.message
    } else if (e instanceof Error && e.message && !params.fail_reason) {
      props.fail_reason = e.message
    }
  }
  track(TrackEvents.ADMIN_SLOT_CAPACITY_SAVE, props, 'T27')
}
