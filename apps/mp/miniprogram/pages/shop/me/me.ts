Page({
  data: { user: {} as any, role: '' },
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
  goWorkbench() {
    wx.reLaunch({ url: '/pages/shop/workbench/workbench' })
  },
})
