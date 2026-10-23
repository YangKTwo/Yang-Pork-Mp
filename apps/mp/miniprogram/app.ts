import { api } from './services/api'
import { applyAuthResponse } from './utils/authSession'
import { getStableDevKey } from './utils/devKey'

App<IAppOption>({
  globalData: {
    userInfo: null,
    accessToken: '',
    role: null,
    profileCompleted: false,
    useMock: false,
  },

  onLaunch() {
    getStableDevKey()
    try {
      const token = wx.getStorageSync('ACCESS_TOKEN') || ''
      const user = wx.getStorageSync('USER_INFO') || null
      const profileCompleted = !!wx.getStorageSync('PROFILE_COMPLETED')
      const useMock = wx.getStorageSync('USE_MOCK')
      this.globalData.accessToken = token
      this.globalData.userInfo = user
      this.globalData.role = user ? user.role : null
      this.globalData.profileCompleted = profileCompleted
      this.globalData.useMock =
        useMock === true || useMock === '1' || useMock === 1 ? true : false
    } catch (_e) {
      /* ignore */
    }
  },

  setSession(token: string, user: UserInfo, profileCompleted: boolean) {
    this.globalData.accessToken = token
    this.globalData.userInfo = user
    this.globalData.role = user.role
    this.globalData.profileCompleted = profileCompleted
    wx.setStorageSync('ACCESS_TOKEN', token)
    wx.setStorageSync('USER_INFO', user)
    wx.setStorageSync('PROFILE_COMPLETED', profileCompleted)
  },

  applyAuthResponse(data: {
    accessToken?: string
    user: UserInfo
    profileCompleted: boolean
  }) {
    applyAuthResponse(this, data)
  },

  clearSession() {
    this.globalData.accessToken = ''
    this.globalData.userInfo = null
    this.globalData.role = null
    this.globalData.profileCompleted = false
    wx.removeStorageSync('ACCESS_TOKEN')
    wx.removeStorageSync('USER_INFO')
    wx.removeStorageSync('PROFILE_COMPLETED')
  },

  async ensureSession() {
    if (this.globalData.accessToken && this.globalData.userInfo) return
    await new Promise<void>((resolve, reject) => {
      wx.login({
        success: async (res) => {
          try {
            const data = await api.wxLogin(res.code || '')
            this.applyAuthResponse(data)
            resolve()
          } catch (e) {
            reject(e)
          }
        },
        fail: reject,
      })
    })
  },

  routeByRole() {
    const { profileCompleted, role } = this.globalData
    if (!this.globalData.accessToken) {
      wx.reLaunch({ url: '/pages/customer/auth/auth' })
      return
    }
    if (!profileCompleted) {
      wx.reLaunch({ url: '/pages/customer/profile/profile' })
      return
    }
    if (role === 'SHOP') {
      wx.reLaunch({ url: '/pages/shop/workbench/workbench' })
      return
    }
    if (role === 'ADMIN') {
      wx.reLaunch({ url: '/pages/shop/workbench/workbench' })
      return
    }
    wx.reLaunch({ url: '/pages/customer/home/home' })
  },
})
