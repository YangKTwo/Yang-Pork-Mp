import { api } from '../../../services/api'
import { track, TrackEvents } from '../../../utils/tracking/index'
import {
  defaultPickupSlotFromConfig,
  pickupSlotHint,
  pickupSlotTrackValue,
  pickupDateForSlotsFromConfig,
  resolvePickupSlots,
  type PickupSlot,
  type PickupSlotMeta,
} from '../../../utils/pickupSlot'
import {
  findSlotMeta,
  isSlotFullBizError,
  showPickupSlotFullFeedback,
  slotCapacityTrackProps,
  slotFullUserMessage,
} from '../../../utils/slotCapacity'

const DEPOSIT_MAP = ['COLLECTED', 'WAIVED', 'NONE']

function reconcileSlot(
  slotOptions: PickupSlotMeta[],
  current: PickupSlot | '',
  config: OrderingConfig
): PickupSlot | '' {
  if (current) {
    const hit = slotOptions.find((s) => s.code === current)
    if (hit && !hit.full) return current
  }
  return defaultPickupSlotFromConfig(config)
}

Page({
  data: {
    realName: '',
    phone: '',
    pickupDate: '',
    pickupSlot: '' as PickupSlot | '',
    slotOptions: [] as PickupSlotMeta[],
    slotHint: '',
    remark: '',
    products: [] as Product[],
    productNames: [] as string[],
    productIndex: 0,
    depositOptions: ['已收线下定金', '免收', '未标记'],
    depositIndex: 0,
    loading: false,
  },
  async onLoad() {
    const [products, config] = await Promise.all([
      api.listProducts(),
      api.orderingConfig(),
    ])
    await this.applyOrderingConfig(config, products, '')
  },
  async applyOrderingConfig(
    config: OrderingConfig,
    products?: Product[],
    keepSlot: PickupSlot | '' = this.data.pickupSlot
  ) {
    const pickupDate = pickupDateForSlotsFromConfig(config)
    const slotOptions = resolvePickupSlots(config)
    const pickupSlot = reconcileSlot(slotOptions, keepSlot, config)
    const patch: Record<string, unknown> = {
      pickupDate,
      slotOptions,
      pickupSlot,
      slotHint: pickupSlot ? pickupSlotHint(pickupSlot, slotOptions) : '',
    }
    if (products) {
      patch.products = products
      patch.productNames = products.map(
        (p) => `${p.name}（¥${(p.priceFen / 100).toFixed(2)}/${p.unit}）`
      )
    }
    this.setData(patch)
  },
  onName(e: any) { this.setData({ realName: e.detail.value }) },
  onPhone(e: any) { this.setData({ phone: e.detail.value }) },
  async onDate(e: any) {
    const pickupDate = String(e.detail.value || '').trim()
    this.setData({ pickupDate })
    if (!pickupDate) return
    try {
      const config = await api.orderingConfig(pickupDate)
      await this.applyOrderingConfig(config, undefined, this.data.pickupSlot)
    } catch (err: any) {
      wx.showToast({ title: err.message || '加载时段失败', icon: 'none' })
    }
  },
  onRemark(e: any) { this.setData({ remark: e.detail.value }) },
  onPick(e: any) { this.setData({ productIndex: Number(e.detail.value) }) },
  onDeposit(e: any) { this.setData({ depositIndex: Number(e.detail.value) }) },
  onPickSlot(e: any) {
    const slot = e.currentTarget.dataset.slot as PickupSlot
    const full = !!e.currentTarget.dataset.full
    if (full) {
      showPickupSlotFullFeedback({
        source: 'shop_manual',
        pickup_slot: slot,
        pickup_date: this.data.pickupDate,
      })
      return
    }
    this.setData({
      pickupSlot: slot,
      slotHint: pickupSlotHint(slot, this.data.slotOptions),
    })
  },
  async onSubmit() {
    const { realName, phone, pickupDate, pickupSlot, products, productIndex, remark, depositIndex } =
      this.data
    if (!realName.trim() || !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请填写姓名与手机', icon: 'none' })
      return
    }
    if (!pickupSlot) {
      wx.showToast({ title: '请选择取货时段', icon: 'none' })
      return
    }
    const slotMeta = findSlotMeta(this.data.slotOptions, pickupSlot)
    if (slotMeta?.full) {
      showPickupSlotFullFeedback({
        source: 'shop_manual',
        pickup_slot: pickupSlot,
        pickup_date: pickupDate,
      })
      return
    }
    const p = products[productIndex]
    if (!p) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const order = await api.createManual({
        realName: realName.trim(),
        phone,
        pickupDate,
        pickupSlot: pickupSlot as PickupSlot,
        items: [{ productId: p.id, quantity: '1' }],
        remark,
        depositOffline: DEPOSIT_MAP[depositIndex],
      })
      track(
        TrackEvents.MANUAL_ORDER_CREATE,
        {
          result: 'success',
          order_id: order.id,
          offline_deposit: DEPOSIT_MAP[depositIndex],
          pickup_slot: pickupSlotTrackValue(pickupSlot),
          ...slotCapacityTrackProps(slotMeta),
        },
        'T18'
      )
      wx.redirectTo({
        url: `/pages/shop/order-detail/order-detail?id=${order.id}`,
      })
    } catch (e: any) {
      if (isSlotFullBizError(e)) {
        showPickupSlotFullFeedback({
          source: 'shop_manual',
          pickup_slot: pickupSlot,
          pickup_date: pickupDate,
          message: slotFullUserMessage(e),
        })
      } else {
        wx.showToast({ title: e.message || '创建失败', icon: 'none' })
      }
      track(
        TrackEvents.MANUAL_ORDER_CREATE,
        {
          result: 'fail',
          pickup_slot: pickupSlotTrackValue(pickupSlot),
          fail_reason: isSlotFullBizError(e) ? 'slot_full' : e.message || 'create_fail',
        },
        'T18'
      )
    } finally {
      this.setData({ loading: false })
    }
  },
})
