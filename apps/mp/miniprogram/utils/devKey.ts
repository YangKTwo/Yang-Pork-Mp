/** 开发/联调用稳定设备标识，后端 mock openid = mock_dev_<devKey> */
const STORAGE_KEY = 'DEV_KEY'

/** 本地 QA：固定 devKey → 独立 mock 用户（与 API SlotCapacityApiTest 命名一致） */
export const DEV_QA_KEYS = {
  customerA: 'dev_customer_a',
  customerB: 'dev_customer_b',
  shop: 'dev_shop',
  admin: 'dev_admin',
} as const

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
  setDevKey(key)
  return key
}

/** 切换本地 QA 身份时写入 devKey（下次 wx-login 映射到新 openid） */
export function setDevKey(key: string): void {
  const trimmed = String(key || '').trim()
  if (!trimmed) {
    throw new Error('devKey 不能为空')
  }
  try {
    wx.setStorageSync(STORAGE_KEY, trimmed)
  } catch (_e) {
    /* ignore */
  }
}

export function getDevKeyOrEmpty(): string {
  try {
    const existing = wx.getStorageSync(STORAGE_KEY)
    if (existing != null && String(existing).trim()) {
      return String(existing).trim()
    }
  } catch (_e) {
    /* ignore */
  }
  return ''
}
