import { api } from '../../../services/api'
import { loadCart, clearCart, cartTotalFen } from '../../../utils/cart'
import { fenToYuan } from '../../../utils/money'
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
import { runPreparedSubscribeFlow } from '../../../utils/subscribeReady'
import { track, TrackEvents } from '../../../utils/tracking/index'

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
    const pickupDate = pickupDateForSlotsFromConfig(config)
    const slotOptions = resolvePickupSlots(config)
    const pickupSlot = reconcileSlot(slotOptions, this.data.pickupSlot, config)
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
    const slotMeta = findSlotMeta(slotOptions, pickupSlot)
    this.setData({
      lines,
      totalYuan: fenToYuan(amountFen),
      depositYuan: fenToYuan(depositFen),
      needDeposit,
      formulaText: config.depositFormulaText,
      pickupDate,
      canOrder: config.canOrderNow,
      amountFen,
      depositFen,
      slotOptions,
      pickupSlot,
      slotHint: pickupSlot ? pickupSlotHint(pickupSlot, slotOptions) : '',
    })
    track(
      TrackEvents.ORDER_CONFIRM_VIEW,
      {
        item_count: lines.length,
        amount_fen: amountFen,
        deposit_fen: depositFen,
        need_deposit: needDeposit,
        pickup_date: pickupDate,
        can_order_now: config.canOrderNow,
        pickup_slot: pickupSlotTrackValue(pickupSlot),
        ...slotCapacityTrackProps(slotMeta),
      },
      'T06'
    )
  },
  onPickSlot(e: any) {
    const slot = e.currentTarget.dataset.slot as PickupSlot
    const full = !!e.currentTarget.dataset.full
    if (full) {
      showPickupSlotFullFeedback({
        source: 'customer_confirm',
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
    const slotMeta = findSlotMeta(this.data.slotOptions, this.data.pickupSlot)
    if (slotMeta?.full) {
      showPickupSlotFullFeedback({
        source: 'customer_confirm',
        pickup_slot: this.data.pickupSlot,
        pickup_date: this.data.pickupDate,
      })
      return
    }
    this.setData({ loading: true })
    const capProps = slotCapacityTrackProps(slotMeta)
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
      track(
        TrackEvents.ORDER_SUBMIT,
        {
          result: 'success',
          need_deposit: order.depositRequired,
          amount_fen: order.totalFen,
          order_id: order.id,
          deposit_fen: order.depositFen,
          status: order.status,
          pickup_slot: pickupSlotTrackValue(this.data.pickupSlot),
          ...capProps,
        },
        'T07'
      )
      clearCart()
      if (order.depositRequired && order.status === 'PENDING_PAY') {
        wx.redirectTo({ url: `/pages/customer/pay-pending/pay-pending?id=${order.id}` })
      } else {
        await runPreparedSubscribeFlow(order.id)
        wx.redirectTo({ url: `/pages/customer/order-detail/order-detail?id=${order.id}` })
      }
    } catch (e: any) {
      const failReason = isSlotFullBizError(e) ? 'slot_full' : e.message || 'submit_fail'
      if (isSlotFullBizError(e)) {
        showPickupSlotFullFeedback({
          source: 'customer_confirm',
          pickup_slot: this.data.pickupSlot,
          pickup_date: this.data.pickupDate,
          message: slotFullUserMessage(e),
        })
      } else {
        wx.showToast({ title: e.message || '下单失败', icon: 'none' })
      }
      track(
        TrackEvents.ORDER_SUBMIT,
        {
          result: 'fail',
          need_deposit: this.data.needDeposit,
          amount_fen: this.data.amountFen,
          fail_reason: failReason,
          pickup_slot: pickupSlotTrackValue(this.data.pickupSlot),
          ...capProps,
        },
        'T07'
      )
    } finally {
      this.setData({ loading: false })
    }
  },
})
