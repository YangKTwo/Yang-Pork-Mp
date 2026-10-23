import { api } from '../../../services/api'
import { fenToYuan, statusLabel } from '../../../utils/money'

function mapList(orders: Order[]) {
  return orders.map((o) => ({
    id: o.id,
    statusText: statusLabel(o.status),
    pickupCode: o.pickupCode,
    realName: o.realName || '—',
    phone: o.phone || '—',
    totalYuan: fenToYuan(o.totalFen),
    summary: (o.items || []).map((i) => i.name).join('、') || '订单',
  }))
}

Page({
  data: {
    tab: 'preorder',
    preorderList: [] as any[],
    manualList: [] as any[],
    isAdmin: false,
  },
  async onShow() {
    const app = getApp<IAppOption>()
    this.setData({ isAdmin: app.globalData.role === 'ADMIN' })
    await this.reload()
  },
  async reload() {
    try {
      const [pre, man] = await Promise.all([
        api.shopPreorderOrders(),
        api.shopManualOrders(),
      ])
      this.setData({
        preorderList: mapList(pre),
        manualList: mapList(man),
      })
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },
  switchTab(e: any) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },
  goDetail(e: any) {
    wx.navigateTo({
      url: `/pages/shop/order-detail/order-detail?id=${e.currentTarget.dataset.id}`,
    })
  },
  goManualCreate() {
    wx.navigateTo({ url: '/pages/shop/manual-create/manual-create' })
  },
  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/home/home' })
  },
  goMe() {
    wx.navigateTo({ url: '/pages/shop/me/me' })
  },
})
