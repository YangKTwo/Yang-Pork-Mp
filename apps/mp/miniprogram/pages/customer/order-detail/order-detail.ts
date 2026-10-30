import { api } from '../../../services/api'
import { fenToYuan, lineItemYuan, statusLabel } from '../../../utils/money'
import { formatPickupSlotDisplay, resolvePickupSlots } from '../../../utils/pickupSlot'
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
      this.setData({
        order: { ...order, items },
        statusText: statusLabel(order.status),
        totalYuan: fenToYuan(order.totalFen),
        depositText,
        pickupSlotText: formatPickupSlotDisplay(order.pickupDate, order.pickupSlot, slotMeta),
        canCancel,
      })
      track(TrackEvents.ORDER_DETAIL_VIEW, {
        order_id: order.id,
        status: order.status,
        has_pickup_code: !!order.pickupCode,
        need_deposit: order.depositRequired,
        source: order.source,
      }, 'C-DETAIL-01')
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
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
