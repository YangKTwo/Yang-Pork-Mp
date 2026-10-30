import { api } from '../../../services/api'
import { loadCart, clearCart, cartTotalFen } from '../../../utils/cart'
import { fenToYuan } from '../../../utils/money'
import {
  defaultPickupSlotFromConfig,
  pickupSlotHint,
  pickupSlotTrackValue,
  resolvePickupSlots,
  type PickupSlot,
  type PickupSlotMeta,
} from '../../../utils/pickupSlot'
import { track, TrackEvents } from '../../../utils/tracking/index'

Page({
  data: {
    lines: [] as any[],
    totalYuan: '0.00',
    depositYuan: '0.00',
    needDeposit: false,
    formulaText: '',
    pickupDate: '',
    pickupSlot: '' as PickupSlot | '',
    slotOptions: [] as PickupSlotMeta[],
    slotHint: '',
    canOrder: true,
    remark: '',
    loading: false,
    amountFen: 0,
    depositFen: 0,
  },
  async onShow() {
    const cart = loadCart()
    if (!cart.length) {
      wx.showToast({ title: '购物车为空', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 500)
      return
    }
    const config = await api.orderingConfig()
    const slotOptions = resolvePickupSlots(config)
    const pickupSlot = defaultPickupSlotFromConfig(config)
    const amountFen = cartTotalFen(cart)
    const needDeposit = amountFen > config.depositThresholdFen
    const depositFen = needDeposit
      ? Math.round((amountFen * config.depositRateBps) / 10000)
      : 0
    const lines = cart.map((l) => ({
      id: l.product.id,
      name: l.product.name,
      unit: l.product.unit,
      quantity: l.quantity,
      lineYuan: fenToYuan(Math.round(l.product.priceFen * l.quantity)),
      productId: l.product.id,
    }))
    this.setData({
      lines,
      totalYuan: fenToYuan(amountFen),
      depositYuan: fenToYuan(depositFen),
      needDeposit,
      formulaText: config.depositFormulaText,
      pickupDate: config.nextPickupDate,
      canOrder: config.canOrderNow,
      amountFen,
      depositFen,
      slotOptions,
      pickupSlot,
      slotHint: pickupSlotHint(pickupSlot, slotOptions),
    })
    track(TrackEvents.ORDER_CONFIRM_VIEW, {
      item_count: lines.length,
      amount_fen: amountFen,
      deposit_fen: depositFen,
      need_deposit: needDeposit,
      pickup_date: config.nextPickupDate,
      can_order_now: config.canOrderNow,
      pickup_slot: pickupSlotTrackValue(pickupSlot),
    }, 'T06')
  },
  onPickSlot(e: any) {
    const slot = e.currentTarget.dataset.slot as PickupSlot
    this.setData({
      pickupSlot: slot,
      slotHint: pickupSlotHint(slot, this.data.slotOptions),
    })
  },
  onRemark(e: any) {
    this.setData({ remark: String(e.detail || '') })
  },
  async onSubmit() {
    if (!this.data.canOrder) {
      track(TrackEvents.ORDER_WINDOW_BLOCK, { can_order_now: false }, 'C-WIN-01')
      wx.showToast({ title: '窗外不可下单', icon: 'none' })
      return
    }
    if (!this.data.pickupSlot) {
      wx.showToast({ title: '请选择取货时段', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const items = this.data.lines.map((l: any) => ({
        productId: l.productId,
        quantity: String(l.quantity),
      }))
      const order = await api.createOrder(
        items,
        this.data.remark,
        this.data.pickupSlot as PickupSlot
      )
      track(TrackEvents.ORDER_SUBMIT, {
        result: 'success',
        need_deposit: order.depositRequired,
        amount_fen: order.totalFen,
        order_id: order.id,
        deposit_fen: order.depositFen,
        status: order.status,
        pickup_slot: pickupSlotTrackValue(this.data.pickupSlot),
      }, 'T07')
      clearCart()
      if (order.depositRequired && order.status === 'PENDING_PAY') {
        wx.redirectTo({ url: `/pages/customer/pay-pending/pay-pending?id=${order.id}` })
      } else {
        wx.redirectTo({ url: `/pages/customer/order-detail/order-detail?id=${order.id}` })
      }
    } catch (e: any) {
      track(TrackEvents.ORDER_SUBMIT, {
        result: 'fail',
        need_deposit: this.data.needDeposit,
        amount_fen: this.data.amountFen,
        fail_reason: e.message || 'submit_fail',
        pickup_slot: pickupSlotTrackValue(this.data.pickupSlot),
      }, 'T07')
      wx.showToast({ title: e.message || '下单失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },
})
