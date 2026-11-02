import { api } from '../../../services/api'
import { readField } from '../../../utils/orderView'

Page({
  data: {
    form: {} as any,
    loading: false,
  },
  async onShow() {
    const cfg = await api.orderingConfig()
    this.setData({ form: { ...cfg } })
  },
  goSlotCapacity() {
    wx.navigateTo({ url: '/pages/admin/slot-capacity/slot-capacity?entry=config' })
  },
  onField(e: any) {
    const k = e.currentTarget.dataset.k
    let v: any = readField(e)
    if (['depositThresholdFen', 'depositRateBps', 'payTimeoutSec'].indexOf(k) >= 0) {
      v = Number(v)
    }
    this.setData({ [`form.${k}`]: v })
  },
  async onSave() {
    this.setData({ loading: true })
    try {
      const f = this.data.form
      const updated = await api.updateAdminConfig({
        orderWindowStart: f.orderWindowStart,
        orderWindowEnd: f.orderWindowEnd,
        cancelDeadline: f.cancelDeadline,
        depositThresholdFen: Number(f.depositThresholdFen),
        depositRateBps: Number(f.depositRateBps),
        payTimeoutSec: Number(f.payTimeoutSec),
      })
      this.setData({ form: updated })
      wx.showToast({ title: '已保存', icon: 'success' })
    } catch (e: any) {
      wx.showToast({ title: e.message || '失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },
})
