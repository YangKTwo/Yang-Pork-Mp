import { api } from '../../../services/api'
import {
  isNoPickupClosed,
  orderStatusDisplayText,
  trackOrderClosedNoPickupOnce,
} from '../../../utils/orderClose'
import { fenToYuan, lineItemYuan } from '../../../utils/money'
import { formatPickupSlotDisplay, resolvePickupSlots } from '../../../utils/pickupSlot'
import {
  canOfferPreparedSubscribe,
  isSubscribeReminderActive,
  isSubscribeOfferRetryable,
  runPreparedSubscribeFlow,
  subscribeReminderCopy,
  trackSubscribeOfferExposure,
} from '../../../utils/subscribeReady'
import { track, TrackEvents } from '../../../utils/tracking/index'

Page({
  data: {
    id: '',
    order: null as any,
    statusText: '',
    totalYuan: '0.00',
    depositText: '',
    pickupSlotText: '',
    canCancel: false,
    showCancel: false,
    cancelling: false,
    subscribeReminderOn: false,
    subscribeBadge: '',
    subscribeHint: '',
    showSubscribeOffer: false,
    subscribing: false,
  },
  onLoad(q: Record<string, string | undefined>) {
    this.setData({ id: q.id || '' })
  },
  async onShow() {
    if (!this.data.id) return
    await this.load()
  },
  async load() {
    try {
      const order = await api.getOrder(this.data.id)
      const config = await api.orderingConfig()
      const slotMeta = resolvePickupSlots(config)
      const items = (order.items || []).map((it) => ({
        ...it,
        lineYuan: lineItemYuan(it),
      }))
      const canCancel =
        order.status === 'PENDING_PREPARE' || order.status === 'PREPARED'
      let depositText = '免定金'
      if (order.depositRequired) {
        depositText =
          order.status === 'PENDING_PAY'
            ? `待付 ¥${fenToYuan(order.depositFen)}`
            : `已付 ¥${fenToYuan(order.depositFen)}`
      }
      const reminderOn = isSubscribeReminderActive(order.subscribeStatus)
      const copy = subscribeReminderCopy(order.subscribeStatus)
      const offerSubscribe =
        order.status === 'PENDING_PREPARE' &&
        !reminderOn &&
        isSubscribeOfferRetryable(order.subscribeStatus) &&
        (await canOfferPreparedSubscribe())
      this.setData({
        order: { ...order, items },
        statusText: orderStatusDisplayText(order),
        totalYuan: fenToYuan(order.totalFen),
        depositText,
        pickupSlotText: formatPickupSlotDisplay(order.pickupDate, order.pickupSlot, slotMeta),
        canCancel,
        subscribeReminderOn: reminderOn,
        subscribeBadge: copy.badge,
        subscribeHint: copy.hint,
        showSubscribeOffer: offerSubscribe,
      })
      if (offerSubscribe) {
        await trackSubscribeOfferExposure(order.id, 'order_detail')
      }
      if (isNoPickupClosed(order)) {
        trackOrderClosedNoPickupOnce(order.id)
      }
      track(TrackEvents.ORDER_DETAIL_VIEW, {
        order_id: order.id,
        status: order.status,
        has_pickup_code: !!order.pickupCode,
        need_deposit: order.depositRequired,
        source: order.source,
        subscribe_status: order.subscribeStatus || 'NONE',
      }, 'C-DETAIL-01')
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },
  async onEnableSubscribe() {
    if (this.data.subscribing) return
    this.setData({ subscribing: true })
    try {
      await runPreparedSubscribeFlow(this.data.id, 'order_detail')
      await this.load()
    } finally {
      this.setData({ subscribing: false })
    }
  },
  openCancel() {
    this.setData({ showCancel: true })
  },
  closeCancel() {
    this.setData({ showCancel: false })
  },
  noop() {},
  async confirmCancel() {
    this.setData({ cancelling: true })
    const before = this.data.order && this.data.order.status
    try {
      const order = await api.cancelOrder(this.data.id)
      track(TrackEvents.ORDER_CANCEL, {
        order_id: order.id,
        result: 'success',
        refund: !!order.depositRequired && order.depositFen > 0,
        status_before: before,
      }, 'C-DETAIL-02')
      this.setData({ showCancel: false })
      await this.load()
      wx.showToast({ title: '已取消', icon: 'success' })
    } catch (e: any) {
      track(TrackEvents.ORDER_CANCEL, {
        order_id: this.data.id,
        result: 'fail',
        fail_reason: e.message || 'cancel_fail',
        status_before: before,
      }, 'C-DETAIL-02')
      wx.showToast({ title: e.message || '取消失败', icon: 'none' })
    } finally {
      this.setData({ cancelling: false })
    }
  },
})
