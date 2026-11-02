import { shopTabs } from '../../../utils/roleTabs'

Page({
  data: { user: {} as any, role: '', tabs: shopTabs('me', false) },
  onShow() {
    const app = getApp<IAppOption>()
    this.setData({
      user: app.globalData.userInfo || {},
      role: app.globalData.role || '',
    })
  },
  logout() {
    getApp<IAppOption>().clearSession()
    wx.reLaunch({ url: '/pages/index/index' })
  },
  onTab(e: any) {
    const key = e.detail && e.detail.key
    if (key === 'workbench') this.goWorkbench()
  },
  goWorkbench() {
    wx.reLaunch({ url: '/pages/shop/workbench/workbench' })
  },
})
