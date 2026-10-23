import type { TrackEventName } from './events'
import type { TrackCommonProps, TrackProps } from './types'

const SESSION_KEY = 'TRACK_SESSION_ID'
const APP_VERSION = '0.1.0'

function shanghaiNow(): string {
  const d = new Date()
  // 展示用：按本地墙钟拼 +08:00（box/用户均为 Asia/Shanghai）
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+08:00`
}

function getSessionId(): string {
  try {
    let id = wx.getStorageSync(SESSION_KEY)
    if (!id) {
      id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      wx.setStorageSync(SESSION_KEY, id)
    }
    return String(id)
  } catch (_e) {
    return `sess_${Date.now()}`
  }
}

function currentPage(): string {
  try {
    const pages = getCurrentPages()
    if (pages && pages.length) {
      const cur = pages[pages.length - 1]
      return (cur && (cur.route || cur.__route__)) || 'unknown'
    }
  } catch (_e) {
    /* ignore */
  }
  return 'unknown'
}

function commonProps(extraPage?: string): TrackCommonProps {
  let user_id: string | null = null
  let role: string | null = null
  try {
    const app = getApp<IAppOption>()
    user_id = (app.globalData.userInfo && app.globalData.userInfo.id) || null
    role = app.globalData.role
  } catch (_e) {
    /* ignore */
  }
  return {
    user_id,
    session_id: getSessionId(),
    page: extraPage || currentPage(),
    timestamp: shanghaiNow(),
    platform: 'mp',
    app_version: APP_VERSION,
    role,
  }
}

/**
 * 埋点 stub：合并公共属性后 console.debug。
 * 真 SDK 只改本文件，调用点不变。
 */
export function track(event: TrackEventName | string, props: TrackProps = {}, pageHint?: string): void {
  const payload = {
    ...commonProps(pageHint),
    ...props,
  }
  // eslint-disable-next-line no-console
  console.debug('[track]', event, payload)
}
