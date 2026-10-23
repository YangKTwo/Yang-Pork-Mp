/** 开发/联调用稳定设备标识，后端 mock openid = mock_dev_<devKey> */
const STORAGE_KEY = 'DEV_KEY'

function newDevKey(): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 10)
  return `${t}_${r}`
}

/** 读取或生成并持久化 devKey（跨会话不变） */
export function getStableDevKey(): string {
  try {
    const existing = wx.getStorageSync(STORAGE_KEY)
    if (existing != null && String(existing).trim()) {
      return String(existing).trim()
    }
  } catch (_e) {
    /* ignore */
  }
  const key = newDevKey()
  try {
    wx.setStorageSync(STORAGE_KEY, key)
  } catch (_e) {
    /* ignore */
  }
  return key
}
