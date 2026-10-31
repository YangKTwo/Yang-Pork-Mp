import { api } from '../../../services/api'
import { fenToYuan } from '../../../utils/money'
import { orderStatusDisplayText } from '../../../utils/orderClose'
import {
  formatPickupSlotDisplay,
  pickupSlotLabel,
  resolvePickupSlots,
  slotFilterOptions,
  type PickupSlotMeta,
} from '../../../utils/pickupSlot'

let cachedSlotMeta: PickupSlotMeta[] = []

function itemSummary(items: OrderItem[] | undefined): string {
  if (!items || !items.length) return '订单'
  return items.map((i) => `${i.name}×${i.quantity}${i.unit || ''}`).join('、')
}

function mapList(orders: Order[], slotMeta: ReturnType<typeof resolvePickupSlots>) {
  return orders.map((o) => ({
    id: o.id,
    statusText: orderStatusDisplayText(o),
    pickupCode: o.pickupCode,
    pickupSlotText: formatPickupSlotDisplay(o.pickupDate, o.pickupSlot, slotMeta),
    pickupSlotLabel: pickupSlotLabel(o.pickupSlot, slotMeta),
    realName: o.realName || '—',
    phone: o.phone || '—',
    totalYuan: fenToYuan(o.totalFen),
    summary: itemSummary(o.items),
    remark: (o.remark || '').trim(),
  }))
}

Page({
  data: {
    tab: 'preorder',
    slotFilter: 'all',
    slotFilters: [] as { code: string; label: string }[],
    preorderList: [] as any[],
    manualList: [] as any[],
    isAdmin: false,
  },
  async onShow() {
    const app = getApp<IAppOption>()
    this.setData({ isAdmin: app.globalData.role === 'ADMIN' })
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
    const slotFilter = String(e.currentTarget.dataset.slot || 'all')
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
  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/home/home' })
  },
  goMe() {
    wx.navigateTo({ url: '/pages/shop/me/me' })
  },
})
