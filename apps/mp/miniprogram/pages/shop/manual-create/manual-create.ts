import { api } from '../../../services/api'
import { track, TrackEvents } from '../../../utils/tracking/index'
import {
  defaultPickupSlotFromConfig,
  pickupSlotHint,
  pickupSlotTrackValue,
  resolvePickupSlots,
  type PickupSlot,
  type PickupSlotMeta,
} from '../../../utils/pickupSlot'

const DEPOSIT_MAP = ['COLLECTED', 'WAIVED', 'NONE']

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
    const slotOptions = resolvePickupSlots(config)
    const pickupSlot = defaultPickupSlotFromConfig(config)
    this.setData({
      products,
      productNames: products.map((p) => `${p.name}（¥${(p.priceFen / 100).toFixed(2)}/${p.unit}）`),
      pickupDate: config.nextPickupDate,
      slotOptions,
      pickupSlot,
      slotHint: pickupSlotHint(pickupSlot, slotOptions),
    })
  },
  onName(e: any) { this.setData({ realName: e.detail.value }) },
  onPhone(e: any) { this.setData({ phone: e.detail.value }) },
  onDate(e: any) { this.setData({ pickupDate: e.detail.value }) },
  onRemark(e: any) { this.setData({ remark: e.detail.value }) },
  onPick(e: any) { this.setData({ productIndex: Number(e.detail.value) }) },
  onDeposit(e: any) { this.setData({ depositIndex: Number(e.detail.value) }) },
  onPickSlot(e: any) {
    const slot = e.currentTarget.dataset.slot as PickupSlot
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
      track(TrackEvents.MANUAL_ORDER_CREATE, {
        result: 'success',
        order_id: order.id,
        offline_deposit: DEPOSIT_MAP[depositIndex],
        pickup_slot: pickupSlot,
      }, 'T18')
      wx.redirectTo({
        url: `/pages/shop/order-detail/order-detail?id=${order.id}`,
      })
    } catch (e: any) {
      track(TrackEvents.MANUAL_ORDER_CREATE, {
        result: 'fail',
        pickup_slot: pickupSlot,
      }, 'T18')
      wx.showToast({ title: e.message || '创建失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },
})
