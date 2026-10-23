import { api } from '../../../services/api'
import { fenToYuan } from '../../../utils/money'

Page({
  data: { list: [] as any[] },
  async onShow() {
    await this.reload()
  },
  async reload() {
    const products = await api.listAllProducts()
    this.setData({
      list: products.map((p) => ({ ...p, priceYuan: fenToYuan(p.priceFen) })),
    })
  },
  async toggleShelf(e: any) {
    const { id, status } = e.currentTarget.dataset
    try {
      await api.setShelf(id, status)
      await this.reload()
      wx.showToast({ title: '已更新', icon: 'success' })
    } catch (err: any) {
      wx.showToast({ title: err.message || '失败', icon: 'none' })
    }
  },
})
