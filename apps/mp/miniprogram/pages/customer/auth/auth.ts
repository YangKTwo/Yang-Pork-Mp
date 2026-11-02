import { api } from '../../../services/api'
import { DEV_QA_KEYS, loginWithDevKey } from '../../../utils/devLogin'
import { track, TrackEvents } from '../../../utils/tracking/index'

Page({
  data: { loading: false, showDev: true },
  async onLogin() {
    this.setData({ loading: true })
    const app = getApp<IAppOption>()
    try {
      await new Promise<void>((resolve, reject) => {
        wx.login({
          success: async (res) => {
            try {
              app.clearSession()
              const data = await api.wxLogin(res.code || '')
              app.applyAuthResponse(data)
              track(TrackEvents.LOGIN_WX, {
                result: 'success',
                profile_completed: data.profileCompleted,
              }, 'C-AUTH-01')
              if (!data.profileCompleted) {
                wx.redirectTo({ url: '/pages/customer/profile/profile' })
              } else {
                app.routeByRole()
              }
              resolve()
            } catch (e: any) {
              track(TrackEvents.LOGIN_WX, {
                result: 'fail',
                profile_completed: false,
                fail_reason: e.message || 'login_fail',
              }, 'C-AUTH-01')
              reject(e)
            }
          },
          fail: (e) => {
            track(TrackEvents.LOGIN_WX, {
              result: 'fail',
              profile_completed: false,
              fail_reason: 'wx.login_fail',
            }, 'C-AUTH-01')
            reject(e)
          },
        })
      })
    } catch (e: any) {
      wx.showToast({ title: e.message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },
  async loginAsDevCustomer(e: WechatMiniprogram.IAnyObject) {
    const devKey = String(e.currentTarget.dataset.devKey || DEV_QA_KEYS.customerA)
    this.setData({ loading: true })
    const app = getApp<IAppOption>()
    try {
      api.setUseMock(false)
      const data = await loginWithDevKey(devKey)
      track(TrackEvents.LOGIN_WX, {
        result: 'success',
        profile_completed: data.profileCompleted,
      }, 'C-AUTH-01')
      if (!data.profileCompleted) {
        wx.redirectTo({ url: '/pages/customer/profile/profile' })
      } else {
        app.routeByRole()
      }
    } catch (err: any) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },
})
