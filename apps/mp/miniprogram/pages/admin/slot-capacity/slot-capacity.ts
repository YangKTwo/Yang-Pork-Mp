/**
 * A-CFG-02 时段容量 · 契约 docs/08_f_slot02_noshow_contract_v0.1.md §1.6
 */
import { api } from '../../../services/api'
import {
  trackAdminSlotCapacitySave,
  trackAdminSlotCapacityView,
} from '../../../utils/adminSlotCapacityTrack'
import { isApiBizError } from '../../../utils/apiEnvelope'
import { FALLBACK_PICKUP_SLOTS, type PickupSlot } from '../../../utils/pickupSlot'

const SLOTS: PickupSlot[] = ['MORNING', 'NOON', 'EVENING']

function parsePositiveInt(raw: string): number | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (!/^\d+$/.test(s)) return null
  const n = Number(s)
  if (!Number.isInteger(n) || n < 1) return null
  return n
}

function toastApiError(e: unknown, fallback: string) {
  const msg =
    e instanceof Error && e.message ? e.message : isApiBizError(e) ? e.message : fallback
  wx.showToast({ title: msg, icon: 'none' })
}

Page({
  data: {
    slotRows: FALLBACK_PICKUP_SLOTS.map((s) => ({
      code: s.code,
      label: s.label,
      hint: s.hint,
    })),
    defaultCaps: {
      MORNING: '30',
      NOON: '30',
      EVENING: '30',
    } as Record<PickupSlot, string>,
    pickupDate: '',
    dayInputs: { MORNING: '', NOON: '', EVENING: '' } as Record<PickupSlot, string>,
    dayDefaults: { MORNING: 30, NOON: 30, EVENING: 30 } as Record<PickupSlot, number>,
    effective: {} as Record<PickupSlot, SlotEffectiveDetail>,
    savingDefault: false,
    savingDay: false,
    loadingDay: false,
    dayDirty: false,
    trackEntry: '' as string,
  },

  onShow() {
    trackAdminSlotCapacityView(this.data.trackEntry || undefined)
  },

  async onLoad(query: Record<string, string | undefined>) {
    const entry = query.entry ? String(query.entry) : ''
    if (entry) this.setData({ trackEntry: entry })
    try {
      const cfg = await api.orderingConfig()
      const caps = cfg.defaultSlotCapacity
      this.setData({
        defaultCaps: {
          MORNING: String(caps?.MORNING ?? 30),
          NOON: String(caps?.NOON ?? 30),
          EVENING: String(caps?.EVENING ?? 30),
        },
        pickupDate: cfg.nextPickupDate,
      })
      await this.loadDayView(cfg.nextPickupDate)
    } catch (e) {
      toastApiError(e, '加载失败')
    }
  },

  onDefaultField(e: any) {
    const slot = e.currentTarget.dataset.slot as PickupSlot
    this.setData({ [`defaultCaps.${slot}`]: e.detail.value })
  },

  onDayField(e: any) {
    const slot = e.currentTarget.dataset.slot as PickupSlot
    this.setData({ [`dayInputs.${slot}`]: e.detail.value, dayDirty: true })
  },

  validateDefaultCaps(): Record<PickupSlot, number> | null {
    const out = {} as Record<PickupSlot, number>
    for (const slot of SLOTS) {
      const n = parsePositiveInt(this.data.defaultCaps[slot])
      if (n === null) {
        wx.showToast({ title: '请输入 ≥1 的整数', icon: 'none' })
        trackAdminSlotCapacitySave({
          result: 'fail',
          scope: 'default',
          fail_reason: 'invalid_capacity',
        })
        return null
      }
      out[slot] = n
    }
    return out
  },

  async onSaveDefault() {
    const caps = this.validateDefaultCaps()
    if (!caps) return
    this.setData({ savingDefault: true })
    try {
      const updated = await api.updateAdminConfig({ defaultSlotCapacity: caps })
      const dc = updated.defaultSlotCapacity
      if (dc) {
        this.setData({
          defaultCaps: {
            MORNING: String(dc.MORNING ?? caps.MORNING),
            NOON: String(dc.NOON ?? caps.NOON),
            EVENING: String(dc.EVENING ?? caps.EVENING),
          },
        })
      }
      wx.showToast({ title: '默认容量已保存', icon: 'success' })
      trackAdminSlotCapacitySave({ result: 'success', scope: 'default', caps })
      await this.loadDayView(this.data.pickupDate)
    } catch (e) {
      toastApiError(e, '保存失败')
      trackAdminSlotCapacitySave({
        result: 'fail',
        scope: 'default',
        caps,
        error: e,
      })
    } finally {
      this.setData({ savingDefault: false })
    }
  },

  applyDayView(view: AdminSlotCapacityView) {
    const dayInputs = {} as Record<PickupSlot, string>
    for (const slot of SLOTS) {
      const ov = view.overrides[slot]
      dayInputs[slot] = ov !== undefined ? String(ov) : ''
    }
    this.setData({
      pickupDate: view.pickupDate,
      dayInputs,
      dayDefaults: view.defaultSlotCapacity,
      effective: view.effective,
      dayDirty: false,
      loadingDay: false,
    })
  },

  async loadDayView(pickupDate: string) {
    if (!pickupDate) return
    this.setData({ loadingDay: true })
    try {
      const view = await api.getAdminSlotCapacity(pickupDate)
      this.applyDayView(view)
    } catch (e) {
      this.setData({ loadingDay: false })
      toastApiError(e, '加载失败')
    }
  },

  onPickDate(e: any) {
    const newDate = String(e.detail.value)
    if (!newDate || newDate === this.data.pickupDate) return
    if (this.data.dayDirty) {
      wx.showModal({
        title: '有未保存修改，是否放弃？',
        confirmText: '放弃',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.loadDayView(newDate)
          }
        },
      })
      return
    }
    this.loadDayView(newDate)
  },

  buildDayCapacities(): Partial<Record<PickupSlot, number | null>> | null {
    const capacities: Partial<Record<PickupSlot, number | null>> = {}
    for (const slot of SLOTS) {
      const trimmed = String(this.data.dayInputs[slot] ?? '').trim()
      if (!trimmed) {
        capacities[slot] = null
        continue
      }
      const n = parsePositiveInt(trimmed)
      if (n === null) {
        wx.showToast({ title: '请输入 ≥1 的整数', icon: 'none' })
        trackAdminSlotCapacitySave({
          result: 'fail',
          scope: 'day',
          pickup_date: this.data.pickupDate,
          fail_reason: 'invalid_capacity',
        })
        return null
      }
      capacities[slot] = n
    }
    return capacities
  },

  async onSaveDay() {
    const capacities = this.buildDayCapacities()
    if (!capacities) return
    const pickupDate = this.data.pickupDate
    this.setData({ savingDay: true })
    try {
      const view = await api.updateAdminSlotCapacity({
        pickupDate,
        capacities,
      })
      this.applyDayView(view)
      wx.showToast({ title: '本日覆盖已保存', icon: 'success' })
      trackAdminSlotCapacitySave({
        result: 'success',
        scope: 'day',
        pickup_date: pickupDate,
        capacities,
      })
    } catch (e) {
      toastApiError(e, '保存失败')
      trackAdminSlotCapacitySave({
        result: 'fail',
        scope: 'day',
        pickup_date: pickupDate,
        capacities,
        error: e,
      })
    } finally {
      this.setData({ savingDay: false })
    }
  },

  onClearDay() {
    const pickupDate = this.data.pickupDate
    wx.showModal({
      title: '清除本日覆盖？',
      content: '该日三档将全部恢复为全局默认。',
      confirmText: '确定清除',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return
        this.setData({ savingDay: true })
        try {
          const view = await api.updateAdminSlotCapacity({
            pickupDate,
            capacities: {},
            clearAll: true,
          })
          this.applyDayView(view)
          wx.showToast({ title: '已清除本日覆盖', icon: 'success' })
          trackAdminSlotCapacitySave({
            result: 'success',
            scope: 'clear_all',
            pickup_date: pickupDate,
          })
        } catch (e) {
          toastApiError(e, '保存失败')
          trackAdminSlotCapacitySave({
            result: 'fail',
            scope: 'clear_all',
            pickup_date: pickupDate,
            error: e,
          })
        } finally {
          this.setData({ savingDay: false })
        }
      },
    })
  },
})
