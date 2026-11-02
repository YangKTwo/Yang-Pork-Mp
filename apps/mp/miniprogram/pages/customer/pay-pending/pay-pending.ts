import { api } from '../../../services/api'
import { fenToYuan } from '../../../utils/money'
import { pickupSlotTrackValue, resolvePickupSlots, type PickupSlotMeta } from '../../../utils/pickupSlot'
import {
  findSlotMeta,
  isSlotFullBizError,
  showPickupSlotFullFeedback,
  slotFullUserMessage,
} from '../../../utils/slotCapacity'
import { runPreparedSubscribeFlow } from '../../../utils/subscribeReady'
import { track, TrackEvents } from '../../../utils/tracking/index'

Page({
  data: {
    id: '',
    depositYuan: '0.00',
    totalYuan: '0.00',
    formulaText: '',
    remainText: '10:00',
    loading: false,
    depositFen: 0,
    amountFen: 0,
    pickupDate: '',
    pickupSlot: '' as PickupSlot | '',
  },
  _timer: 0 as any,
  _paySlotMeta: null as PickupSlotMeta | null | undefined,
  async onLoad(q: Record<string, string | undefined>) {
    this.setData({ id: q.id || '' })
  },
  async onShow() {
    if (!this.data.id) return
    try {
      const order = await api.getOrder(this.data.id)
      this.setData({
        depositYuan: fenToYuan(order.depositFen),
        totalYuan: fenToYuan(order.totalFen),
        formulaText: order.depositFormulaText,
        depositFen: order.depositFen,
        amountFen: order.totalFen,
        pickupDate: order.pickupDate,
        pickupSlot: order.pickupSlot || '',
      })
      if (order.pickupDate && order.pickupSlot) {
        try {
          const cfg = await api.orderingConfig(order.pickupDate)
          const slots = resolvePickupSlots(cfg)
          this._paySlotMeta = findSlotMeta(slots, order.pickupSlot) || null
        } catch (_e) {
          this._paySlotMeta = null
        }
      }
      track(TrackEvents.PAY_PAGE_VIEW, {
        order_id: order.id,
        deposit_fen: order.depositFen,
        amount_fen: order.totalFen,
        pay_timeout_sec: 600,
        pay_mode: 'mock',
      }, 'C-PAY-01')
      this.startCountdown(order.payExpireAt)
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },
  onUnload() {
    if (this._timer) clearInterval(this._timer)
  },
  startCountdown(expireAt: string | null) {
    if (this._timer) clearInterval(this._timer)
    const tick = () => {
      if (!expireAt) {
        this.setData({ remainText: '—' })
        return
      }
      const remain = Math.max(0, Math.floor((new Date(expireAt).getTime() - Date.now()) / 1000))
      const m = Math.floor(remain / 60)
      const s = remain % 60
      this.setData({
        remainText: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      })
      if (remain <= 0) {
        clearInterval(this._timer)
        track(TrackEvents.ORDER_CLOSED_TIMEOUT, {
          order_id: this.data.id,
          pay_timeout_sec: 600,
        }, 'C-PAY-01')
      }
    }
    tick()
    this._timer = setInterval(tick, 1000) as any
  },
  async onMockPay() {
    this.setData({ loading: true })
    try {
      await api.createPay(this.data.id)
      const order = await api.payMockSuccess(this.data.id)
      track(TrackEvents.PAY_MOCK_SUCCESS, {
        order_id: order.id,
        deposit_fen: order.depositFen,
        pay_mode: 'mock',
        amount_fen: order.totalFen,
        from_status: 'PENDING_PAY',
        to_status: order.status,
      }, 'C-PAY-02')
      await runPreparedSubscribeFlow(order.id)
      wx.redirectTo({ url: `/pages/customer/order-detail/order-detail?id=${order.id}` })
    } catch (e: any) {
      if (isSlotFullBizError(e)) {
        showPickupSlotFullFeedback({
          source: 'pay',
          pickup_slot: this.data.pickupSlot,
          pickup_date: this.data.pickupDate,
          message: slotFullUserMessage(e),
          slotMeta: this._paySlotMeta,
        })
      } else {
        wx.showToast({ title: e.message || '支付失败', icon: 'none' })
        track(
          TrackEvents.PAY_MOCK_FAIL,
          {
            order_id: this.data.id,
            result: 'fail',
            fail_reason: e.message || 'pay_fail',
            deposit_fen: this.data.depositFen,
            pickup_slot: pickupSlotTrackValue(this.data.pickupSlot),
          },
          'C-PAY-02'
        )
      }
    } finally {
      this.setData({ loading: false })
    }
  },
})
