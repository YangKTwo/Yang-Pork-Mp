import { api } from '../../../services/api'
import { fenToYuan, statusLabel } from '../../../utils/money'
import { formatPickupSlotDisplay, resolvePickupSlots } from '../../../utils/pickupSlot'

Page({
  data: { list: [] as any[] },
  async onShow() {
    try {
      const [orders, config] = await Promise.all([api.listMyOrders(), api.orderingConfig()])
      const slotMeta = resolvePickupSlots(config)
      this.setData({
        list: orders.map((o) => ({
          id: o.id,
          statusText: statusLabel(o.status),
          pickupDate: o.pickupDate,
          pickupSlotText: formatPickupSlotDisplay(o.pickupDate, o.pickupSlot, slotMeta),
          totalYuan: fenToYuan(o.totalFen),
          pickupCode: o.pickupCode,
          summary:
            (o.items || []).map((i) => `${i.name}×${i.quantity}${i.unit || ''}`).join('、') ||
            '订单',
        })),
      })
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },
  goDetail(e: any) {
    wx.navigateTo({
      url: `/pages/customer/order-detail/order-detail?id=${e.currentTarget.dataset.id}`,
    })
  },
  goHome() {
    wx.reLaunch({ url: '/pages/customer/home/home' })
  },
  goMe() {
    wx.navigateTo({ url: '/pages/customer/me/me' })
  },
})
