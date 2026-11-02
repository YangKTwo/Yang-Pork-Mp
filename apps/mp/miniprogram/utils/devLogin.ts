import { api } from '../services/api'
import { DEV_QA_KEYS, setDevKey } from './devKey'

type DevLoginOptions = {
  useMock?: boolean
  role?: UserRole
}

/** 开发/QA：写入 devKey、清会话并 wx-login */
export async function loginWithDevKey(devKey: string, options: DevLoginOptions = {}) {
  const app = getApp<IAppOption>()
  if (options.useMock !== undefined) {
    api.setUseMock(options.useMock)
  }
  setDevKey(devKey)
  if (options.role) {
    api.mockSwitchRole(options.role, devKey)
  }
  app.clearSession()
  const data = await api.wxLogin('dev_switch')
  app.applyAuthResponse(data)
  return data
}

export { DEV_QA_KEYS }
