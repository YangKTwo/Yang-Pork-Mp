/** F-SLOT-01：与 BE 契约一致 MORNING | NOON | EVENING */
export type PickupSlot = 'MORNING' | 'NOON' | 'EVENING'

export interface PickupSlotMeta {
  code: PickupSlot
  label: string
  hint: string
}

/** PM/BE 定稿兜底（与 docs/07_f_slot_sub_contract_v0.1.md §1.2 一致） */
export const FALLBACK_PICKUP_SLOTS: PickupSlotMeta[] = [
  { code: 'MORNING', label: '上午取', hint: '08:00–11:00' },
  { code: 'NOON', label: '中午取', hint: '11:00–14:00' },
  { code: 'EVENING', label: '下午取', hint: '14:00–18:00' },
]

export function isPickupSlot(v: unknown): v is PickupSlot {
  return v === 'MORNING' || v === 'NOON' || v === 'EVENING'
}

/** 埋点属性 pickup_slot：与 API pickupSlot 同枚举，勿改大小写 */
export function pickupSlotTrackValue(slot: PickupSlot | string | null | undefined): PickupSlot | undefined {
  return isPickupSlot(slot) ? slot : undefined
}

export function resolvePickupSlots(config?: OrderingConfig | null): PickupSlotMeta[] {
  const fromCfg = config && config.pickupSlots
  if (fromCfg && fromCfg.length) {
    return fromCfg
      .filter((s) => isPickupSlot(s.code))
      .map((s) => ({
        code: s.code as PickupSlot,
        label: s.label || s.code,
        hint: s.hint || '',
      }))
  }
  return FALLBACK_PICKUP_SLOTS
}

export function defaultPickupSlotFromConfig(config?: OrderingConfig | null): PickupSlot {
  const slots = resolvePickupSlots(config)
  const d = config && config.defaultPickupSlot
  if (isPickupSlot(d) && slots.some((s) => s.code === d)) return d
  return slots[0]?.code || 'MORNING'
}

export function pickupSlotLabel(
  slot: PickupSlot | string | null | undefined,
  slots?: PickupSlotMeta[]
): string {
  if (!slot) return '—'
  const list = slots && slots.length ? slots : FALLBACK_PICKUP_SLOTS
  const hit = list.find((s) => s.code === slot)
  return hit ? hit.label : String(slot)
}

export function pickupSlotHint(
  slot: PickupSlot | string | null | undefined,
  slots?: PickupSlotMeta[]
): string {
  if (!slot) return ''
  const list = slots && slots.length ? slots : FALLBACK_PICKUP_SLOTS
  const hit = list.find((s) => s.code === slot)
  return hit ? hit.hint : ''
}

/** 列表/详情：2026-10-24 · 上午取 */
export function formatPickupSlotDisplay(
  pickupDate: string | null | undefined,
  slot: PickupSlot | string | null | undefined,
  slots?: PickupSlotMeta[]
): string {
  const lbl = pickupSlotLabel(slot, slots)
  if (lbl === '—') return pickupDate || '—'
  const day = pickupDate || '次日'
  return `${day} · ${lbl}`
}

/** 店家列表筛选：全部 + 各档 */
export function slotFilterOptions(slots: PickupSlotMeta[]): { code: string; label: string }[] {
  return [{ code: 'all', label: '全部' }, ...slots.map((s) => ({ code: s.code, label: s.label }))]
}
