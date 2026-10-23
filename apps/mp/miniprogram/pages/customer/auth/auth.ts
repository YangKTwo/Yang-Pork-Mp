import { api } from '../../../services/api'
import { track, TrackEvents } from '../../../utils/tracking/index'

Page({
  data: { loading: false },
  async onLogin() {
    this.setData({ loading: true })
    const app = getApp<IAppOption>()
    try {
      await new Promise<void>((resolve, reject) => {
        wx.login({
          success: async (res) => {
            try {
              const data = await api.wxLogin(res.code || 'mock_code')
              app.setSession(data.accessToken, data.user, data.profileCompleted)
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
})
