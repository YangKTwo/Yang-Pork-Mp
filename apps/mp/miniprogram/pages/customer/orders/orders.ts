import { api } from '../../../services/api'
import { mapCustomerOrderCard } from '../../../utils/orderView'
import { customerTabs } from '../../../utils/roleTabs'
import { resolvePickupSlots } from '../../../utils/pickupSlot'

Page({
  data: { list: [] as any[], tabs: customerTabs('orders') },
  async onShow() {
    try {
      const [orders, config] = await Promise.all([api.listMyOrders(), api.orderingConfig()])
      const slotMeta = resolvePickupSlots(config)
      this.setData({
        list: orders.map((o) => mapCustomerOrderCard(o, slotMeta)),
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
  onTab(e: any) {
    const key = e.detail && e.detail.key
    if (key === 'home') this.goHome()
    if (key === 'me') this.goMe()
  },
  goHome() {
    wx.reLaunch({ url: '/pages/customer/home/home' })
  },
  goMe() {
    wx.navigateTo({ url: '/pages/customer/me/me' })
  },
})
