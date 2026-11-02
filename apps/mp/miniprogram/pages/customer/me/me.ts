import { api } from '../../../services/api'
import { DEV_QA_KEYS, loginWithDevKey } from '../../../utils/devLogin'
import { customerTabs } from '../../../utils/roleTabs'
import { getDevKeyOrEmpty } from '../../../utils/devKey'

Page({
  data: {
    user: {} as any,
    baseURL: '',
    useMock: false,
    devKey: '',
    tabs: customerTabs('me'),
  },
  onShow() {
    const app = getApp<IAppOption>()
    this.setData({
      user: app.globalData.userInfo || {},
      baseURL: api.getBaseURL(),
      useMock: app.globalData.useMock,
      devKey: getDevKeyOrEmpty() || api.getDevKey(),
    })
  },
  toggleMock() {
    const app = getApp<IAppOption>()
    const next = !app.globalData.useMock
    api.setUseMock(next)
    this.setData({ useMock: next })
    wx.showToast({ title: next ? 'Mock 已开' : 'Mock 已关', icon: 'none' })
  },
  logout() {
    getApp<IAppOption>().clearSession()
    wx.reLaunch({ url: '/pages/customer/auth/auth' })
  },
  async switchDevCustomer(e: WechatMiniprogram.IAnyObject) {
    const devKey = String(e.currentTarget.dataset.devKey || DEV_QA_KEYS.customerA)
    wx.showLoading({ title: '切换身份…' })
    const app = getApp<IAppOption>()
    try {
      const data = await loginWithDevKey(devKey, { useMock: app.globalData.useMock })
      if (!data.profileCompleted) {
        wx.redirectTo({ url: '/pages/customer/profile/profile' })
        return
      }
      app.routeByRole()
    } catch (err: any) {
      wx.showToast({ title: err.message || '切换失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },
  onTab(e: any) {
    const key = e.detail && e.detail.key
    if (key === 'home') this.goHome()
    if (key === 'orders') this.goOrders()
  },
  goHome() {
    wx.reLaunch({ url: '/pages/customer/home/home' })
  },
  goOrders() {
    wx.navigateTo({ url: '/pages/customer/orders/orders' })
  },
})
