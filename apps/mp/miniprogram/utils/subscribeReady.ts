/**
 * F-SUB-01：备货完成订阅（docs/07_f_slot_sub_contract_v0.1.md §2）
 * 埋点 T21/T22（docs/08_TRACKING_MP_FUNNEL.md §3.3）
 */
import { api } from '../services/api'
import { track, TrackEvents } from './tracking/index'

interface WxWithSubscribe {
  requestSubscribeMessage(options: {
    tmplIds: string[]
    success?: (res: Record<string, string | undefined>) => void
    fail?: (err: { errMsg?: string }) => void
  }): void
}

export function isSubscribeReminderActive(
  status: SubscribeStatus | undefined
): status is 'ACCEPTED' | 'SENT' {
  return status === 'ACCEPTED' || status === 'SENT'
}

export function subscribeReminderCopy(status: SubscribeStatus | undefined): {
  badge: string
  hint: string
} {
  if (status === 'SENT') {
    return {
      badge: '可取货提醒',
      hint: '备货完成通知已发送，请按取货日携带取货码到店',
    }
  }
  if (status === 'ACCEPTED') {
    return {
      badge: '可取货提醒',
      hint: '已开启提醒，备货完成后将通过微信通知您',
    }
  }
  return { badge: '', hint: '' }
}

async function loadPreparedTmplId(): Promise<string> {
  const cfg = await api.orderingConfig()
  const id = cfg.subscribePreparedTmplId
  return id ? String(id).trim() : ''
}

function isMockMode(): boolean {
  const app = getApp<IAppOption>()
  if (app && app.globalData.useMock) return true
  try {
    const v = wx.getStorageSync('USE_MOCK')
    return v === true || v === '1' || v === 1
  } catch (_e) {
    return false
  }
}

/** T21/T22 scene：入口场景（模板仍为备货完成 subscribePreparedTmplId） */
export type SubscribeTrackScene = 'after_order' | 'order_detail'

function subscribeAuthResultFromWxStatus(
  wxStatus: string
): 'accept' | 'reject' | 'ban' {
  if (wxStatus === 'accept') return 'accept'
  if (wxStatus === 'ban') return 'ban'
  return 'reject'
}

function trackAuthPrompt(orderId: string, tmplId: string, scene: SubscribeTrackScene) {
  track(
    TrackEvents.SUBSCRIBE_AUTH_PROMPT,
    { order_id: orderId, tmpl_id: tmplId, scene },
    'T21'
  )
}

function trackAuthResult(
  orderId: string,
  tmplId: string,
  scene: SubscribeTrackScene,
  result: 'accept' | 'reject' | 'ban' | 'fail' | 'mock_accept',
  wxStatus?: string
) {
  track(
    TrackEvents.SUBSCRIBE_AUTH_RESULT,
    {
      order_id: orderId,
      tmpl_id: tmplId,
      scene,
      result,
      ...(wxStatus ? { wx_status: wxStatus } : {}),
    },
    'T22'
  )
}

/** 详情页「开启提醒」CTA 曝光（view），不含授权弹窗 */
export async function trackSubscribeOfferExposure(
  orderId: string,
  scene: SubscribeTrackScene = 'order_detail'
): Promise<void> {
  const tmplId = await loadPreparedTmplId()
  if (!tmplId) return
  trackAuthPrompt(orderId, tmplId, scene)
}

export function isSubscribeOfferRetryable(status: SubscribeStatus | undefined | null): boolean {
  return (
    status === 'NONE' ||
    status == null ||
    status === 'FAILED' ||
    status === 'SKIPPED_NO_AUTH'
  )
}

/** 用户点击链路内：拉起授权并 POST /orders/{id}/subscribe */
export async function runPreparedSubscribeFlow(
  orderId: string,
  scene: SubscribeTrackScene = 'after_order'
): Promise<Order | null> {
  const tmplId = await loadPreparedTmplId()
  if (!tmplId) return null

  trackAuthPrompt(orderId, tmplId, scene)

  let accepted = false
  if (isMockMode()) {
    accepted = true
    trackAuthResult(orderId, tmplId, scene, 'mock_accept', 'accept')
  } else {
    accepted = await new Promise<boolean>((resolve) => {
      ;(wx as WxWithSubscribe).requestSubscribeMessage({
        tmplIds: [tmplId],
        success: (res) => {
          const wxStatus = String(res[tmplId] || '')
          const ok = wxStatus === 'accept'
          trackAuthResult(
            orderId,
            tmplId,
            scene,
            subscribeAuthResultFromWxStatus(wxStatus),
            wxStatus
          )
          resolve(ok)
        },
        fail: (err) => {
          trackAuthResult(orderId, tmplId, scene, 'fail', err.errMsg || 'wx_fail')
          resolve(false)
        },
      })
    })
  }

  try {
    return await api.orderSubscribe(orderId, { accepted })
  } catch (_e) {
    return null
  }
}

export async function canOfferPreparedSubscribe(): Promise<boolean> {
  return !!(await loadPreparedTmplId())
}
