/** F-SLOT-01：与 BE 契约一致 MORNING | NOON | EVENING */
export type PickupSlot = 'MORNING' | 'NOON' | 'EVENING'

export interface PickupSlotMeta {
  code: PickupSlot
  label: string
  hint: string
  /** F-SLOT-02 */
  capacity?: number
  occupied?: number
  remaining?: number
  full?: boolean
}

const DEFAULT_SLOT_CAPACITY = 30

/** PM/BE 定稿兜底（与 docs/07_f_slot_sub_contract_v0.1.md §1.2 一致） */
export const FALLBACK_PICKUP_SLOTS: PickupSlotMeta[] = [
  { code: 'MORNING', label: '上午取', hint: '08:00–11:00', capacity: DEFAULT_SLOT_CAPACITY, occupied: 0, remaining: DEFAULT_SLOT_CAPACITY, full: false },
  { code: 'NOON', label: '中午取', hint: '11:00–14:00', capacity: DEFAULT_SLOT_CAPACITY, occupied: 0, remaining: DEFAULT_SLOT_CAPACITY, full: false },
  { code: 'EVENING', label: '下午取', hint: '14:00–18:00', capacity: DEFAULT_SLOT_CAPACITY, occupied: 0, remaining: DEFAULT_SLOT_CAPACITY, full: false },
]

export function isPickupSlot(v: unknown): v is PickupSlot {
  return v === 'MORNING' || v === 'NOON' || v === 'EVENING'
}

/** 埋点属性 pickup_slot：与 API pickupSlot 同枚举，勿改大小写 */
export function pickupSlotTrackValue(slot: PickupSlot | string | null | undefined): PickupSlot | undefined {
  return isPickupSlot(slot) ? slot : undefined
}

function mapOrderingSlot(s: OrderingPickupSlot): PickupSlotMeta {
  const full = !!s.full
  const capacity = typeof s.capacity === 'number' ? s.capacity : DEFAULT_SLOT_CAPACITY
  const remaining =
    typeof s.remaining === 'number' ? s.remaining : full ? 0 : capacity
  return {
    code: s.code as PickupSlot,
    label: s.label || s.code,
    hint: s.hint || '',
    capacity,
    occupied: typeof s.occupied === 'number' ? s.occupied : undefined,
    remaining,
    full,
  }
}

export function resolvePickupSlots(config?: OrderingConfig | null): PickupSlotMeta[] {
  const fromCfg = config && config.pickupSlots
  if (fromCfg && fromCfg.length) {
    return fromCfg.filter((s) => isPickupSlot(s.code)).map(mapOrderingSlot)
  }
  return FALLBACK_PICKUP_SLOTS.map((s) => ({ ...s }))
}

/** 首选 defaultPickupSlot，跳过已满档；全无空档时返回空串 */
export function defaultPickupSlotFromConfig(config?: OrderingConfig | null): PickupSlot | '' {
  const slots = resolvePickupSlots(config)
  const d = config && config.defaultPickupSlot
  if (isPickupSlot(d)) {
    const hit = slots.find((s) => s.code === d)
    if (hit && !hit.full) return d
  }
  const open = slots.find((s) => !s.full)
  return open ? open.code : ''
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
  if (!hit) return ''
  if (hit.full) return `${hit.hint} · 已约满`
  if (typeof hit.remaining === 'number') return `${hit.hint} · 剩余 ${hit.remaining}`
  return hit.hint
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

export interface SlotFilterOption {
  code: string
  label: string
  full?: boolean
}

/** 店家列表筛选：全部 + 各档（含 full 供 Tag） */
export function slotFilterOptions(slots: PickupSlotMeta[]): SlotFilterOption[] {
  return [
    { code: 'all', label: '全部', full: false },
    ...slots.map((s) => ({ code: s.code, label: s.label, full: !!s.full })),
  ]
}

export function pickupDateForSlotsFromConfig(config: OrderingConfig): string {
  return config.pickupDateForSlots || config.nextPickupDate
}
