import { api } from '../../../services/api'
import { orderClosedDetailNote, orderDetailStatusTag } from '../../../utils/orderClose'
import { shopDepositText, sourceLabel, statusTagType, withLineYuan } from '../../../utils/orderView'
import { formatPickupSlotDisplay, resolvePickupSlots } from '../../../utils/pickupSlot'
import { track, TrackEvents } from '../../../utils/tracking/index'

Page({
  data: {
    id: '',
    order: null as any,
    statusText: '',
    statusTagType: 'primary',
    sourceText: '',
    closedDetailNote: '',
    depositText: '',
    pickupSlotText: '',
    canShopCancel: false,
    showCancel: false,
    cancelReason: '',
    reasonError: false,
    canConfirmCancel: false,
    acting: false,
    cancelling: false,
  },
  onLoad(q: Record<string, string | undefined>) {
    this.setData({ id: q.id || '' })
  },
  async onShow() {
    if (this.data.id) await this.load()
  },
  async load() {
    try {
      const order = await api.getOrder(this.data.id)
      const config = await api.orderingConfig()
      const slotMeta = resolvePickupSlots(config)
      const items = withLineYuan(order.items)
      const canShopCancel =
        order.status === 'PENDING_PREPARE' || order.status === 'PREPARED'
      const depositText = shopDepositText(order)
      this.setData({
        order: { ...order, items },
        statusText: orderDetailStatusTag(order),
        statusTagType: statusTagType(order.status, order.closeReason),
        sourceText: sourceLabel(order.source),
        closedDetailNote: orderClosedDetailNote(order),
        depositText,
        pickupSlotText: formatPickupSlotDisplay(order.pickupDate, order.pickupSlot, slotMeta),
        canShopCancel,
      })
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },
  async onPrepare() {
    this.setData({ acting: true })
    try {
      const order = await api.prepareOrder(this.data.id)
      track(TrackEvents.SHOP_PREPARE, {
        order_id: order.id,
        result: 'success',
        source: order.source,
      }, 'S-ACT-01')
      await this.load()
      wx.showToast({ title: '已备货', icon: 'success' })
    } catch (e: any) {
      track(TrackEvents.SHOP_PREPARE, {
        order_id: this.data.id,
        result: 'fail',
      }, 'S-ACT-01')
      wx.showToast({ title: e.message || '失败', icon: 'none' })
    } finally {
      this.setData({ acting: false })
    }
  },
  async onPickup() {
    const code = (this.data.order && this.data.order.pickupCode) || ''
    this.setData({ acting: true })
    try {
      const order = await api.pickupOrder(this.data.id, code)
      track(TrackEvents.PICKUP_VERIFY_SUCCESS, {
        order_id: order.id,
        result: 'success',
        pickup_code_len: String(code).length,
        source: order.source,
      }, 'S-ACT-02')
      await this.load()
      wx.showToast({ title: '已核销', icon: 'success' })
    } catch (e: any) {
      track(TrackEvents.PICKUP_VERIFY_FAIL, {
        order_id: this.data.id,
        result: 'fail',
        fail_reason: e.message || 'verify_fail',
      }, 'S-ACT-02')
      wx.showToast({ title: e.message || '核销失败', icon: 'none' })
    } finally {
      this.setData({ acting: false })
    }
  },
  openCancel() {
    this.setData({
      showCancel: true,
      cancelReason: '',
      reasonError: false,
      canConfirmCancel: false,
    })
  },
  closeCancel() {
    this.setData({ showCancel: false })
  },
  onReason(e: any) {
    const cancelReason = String(e.detail || '')
    const ok = !!cancelReason.trim()
    this.setData({
      cancelReason,
      canConfirmCancel: ok,
      reasonError: !ok,
    })
  },
  noop() {},
  async confirmCancel() {
    const reason = (this.data.cancelReason || '').trim()
    if (!reason) {
      this.setData({ reasonError: true, canConfirmCancel: false })
      return
    }
    this.setData({ cancelling: true })
    try {
      const order = await api.shopCancel(this.data.id, reason)
      track(TrackEvents.SHOP_CANCEL, {
        order_id: order.id,
        result: 'success',
        has_reason: true,
        refund: !!(order.depositRequired && order.depositFen > 0),
        source: order.source,
      }, 'S-ACT-03')
      this.setData({ showCancel: false })
      await this.load()
      wx.showToast({ title: '已取消', icon: 'success' })
    } catch (e: any) {
      track(TrackEvents.SHOP_CANCEL, {
        order_id: this.data.id,
        result: 'fail',
        has_reason: !!reason,
      }, 'S-ACT-03')
      wx.showToast({ title: e.message || '取消失败', icon: 'none' })
    } finally {
      this.setData({ cancelling: false })
    }
  },
})
