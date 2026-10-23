import { api } from '../../../services/api'

Page({
  data: {
    user: {} as any,
    baseURL: '',
    useMock: false,
  },
  onShow() {
    const app = getApp<IAppOption>()
    this.setData({
      user: app.globalData.userInfo || {},
      baseURL: api.getBaseURL(),
      useMock: app.globalData.useMock,
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
  goHome() {
    wx.reLaunch({ url: '/pages/customer/home/home' })
  },
  goOrders() {
    wx.navigateTo({ url: '/pages/customer/orders/orders' })
  },
})
