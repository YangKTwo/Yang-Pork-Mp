import { api } from '../../services/api'

Page({
  data: { showDev: true },
  onShow() {
    const app = getApp<IAppOption>()
    if (app.globalData.accessToken && app.globalData.profileCompleted) {
      app.routeByRole()
    }
  },
  async goAs(e: WechatMiniprogram.IAnyObject) {
    const role = (e.currentTarget.dataset.role || 'CUSTOMER') as UserRole
    api.mockSwitchRole(role)
    api.setUseMock(true)
    const app = getApp<IAppOption>()
    app.clearSession()
    try {
      const data = await api.wxLogin('dev_switch')
      app.applyAuthResponse(data)
      app.routeByRole()
    } catch (err: any) {
      wx.showToast({ title: err.message || '进入失败', icon: 'none' })
    }
  },
})
