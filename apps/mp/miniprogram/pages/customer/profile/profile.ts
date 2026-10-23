import { api } from '../../../services/api'
import { track, TrackEvents } from '../../../utils/tracking/index'

Page({
  data: { realName: '', phone: '', canSubmit: false, loading: false },
  onName(e: any) {
    this.setData({ realName: String(e.detail || '') })
    this.refresh()
  },
  onPhone(e: any) {
    this.setData({ phone: String(e.detail || '') })
    this.refresh()
  },
  refresh() {
    const { realName, phone } = this.data
    this.setData({ canSubmit: !!realName.trim() && /^1\d{10}$/.test(phone) })
  },
  async onSubmit() {
    if (!this.data.canSubmit) return
    this.setData({ loading: true })
    const app = getApp<IAppOption>()
    try {
      const data = await api.completeProfile(this.data.realName.trim(), this.data.phone)
      app.applyAuthResponse({
        accessToken: data.accessToken,
        user: data.user,
        profileCompleted: data.profileCompleted ?? true,
      })
      track(TrackEvents.PROFILE_SUBMIT, { result: 'success' }, 'C-AUTH-02')
      app.routeByRole()
    } catch (e: any) {
      track(TrackEvents.PROFILE_SUBMIT, {
        result: 'fail',
        fail_reason: e.message || 'profile_fail',
      }, 'C-AUTH-02')
      wx.showToast({ title: e.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },
})
