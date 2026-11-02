import { api } from '../../services/api'
import { DEV_QA_KEYS, loginWithDevKey } from '../../utils/devLogin'

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
    const devKey = String(
      e.currentTarget.dataset.devKey ||
        (role === 'SHOP'
          ? DEV_QA_KEYS.shop
          : role === 'ADMIN'
            ? DEV_QA_KEYS.admin
            : DEV_QA_KEYS.customerA)
    )
    try {
      await loginWithDevKey(devKey, { useMock: true, role })
      getApp<IAppOption>().routeByRole()
    } catch (err: any) {
      wx.showToast({ title: err.message || '进入失败', icon: 'none' })
    }
  },
})
