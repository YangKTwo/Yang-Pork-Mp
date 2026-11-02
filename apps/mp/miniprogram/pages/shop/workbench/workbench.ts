import { api } from '../../../services/api'
import { mapShopOrderCard } from '../../../utils/orderView'
import { shopTabs } from '../../../utils/roleTabs'
import {
  resolvePickupSlots,
  slotFilterOptions,
  type PickupSlotMeta,
} from '../../../utils/pickupSlot'

let cachedSlotMeta: PickupSlotMeta[] = []

function mapList(orders: Order[], slotMeta: ReturnType<typeof resolvePickupSlots>) {
  return orders.map((order) => mapShopOrderCard(order, slotMeta))
}

Page({
  data: {
    tab: 'preorder',
    slotFilter: 'all',
    slotFilters: [] as { code: string; label: string }[],
    preorderList: [] as any[],
    manualList: [] as any[],
    isAdmin: false,
    tabs: shopTabs('workbench', false),
  },
  async onShow() {
    const app = getApp<IAppOption>()
    const isAdmin = app.globalData.role === 'ADMIN'
    this.setData({ isAdmin, tabs: shopTabs('workbench', isAdmin) })
    const config = await api.orderingConfig()
    cachedSlotMeta = resolvePickupSlots(config)
    this.setData({ slotFilters: slotFilterOptions(cachedSlotMeta) })
    await this.reload()
  },
  async reload() {
    try {
      const query =
        this.data.slotFilter && this.data.slotFilter !== 'all'
          ? { pickupSlot: this.data.slotFilter }
          : undefined
      const [pre, man] = await Promise.all([
        api.shopPreorderOrders(query),
        api.shopManualOrders(query),
      ])
      this.setData({
        preorderList: mapList(pre, cachedSlotMeta),
        manualList: mapList(man, cachedSlotMeta),
      })
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },
  switchTab(e: any) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },
  switchSlotFilter(e: any) {
    const slotFilter = String((e.detail && e.detail.slot) || 'all')
    this.setData({ slotFilter }, () => this.reload())
  },
  goDetail(e: any) {
    wx.navigateTo({
      url: `/pages/shop/order-detail/order-detail?id=${e.currentTarget.dataset.id}`,
    })
  },
  goManualCreate() {
    wx.navigateTo({ url: '/pages/shop/manual-create/manual-create' })
  },
  onTab(e: any) {
    const key = e.detail && e.detail.key
    if (key === 'admin') this.goAdmin()
    if (key === 'me') this.goMe()
  },
  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/home/home' })
  },
  goMe() {
    wx.navigateTo({ url: '/pages/shop/me/me' })
  },
})
