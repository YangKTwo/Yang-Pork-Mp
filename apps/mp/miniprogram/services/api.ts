/**
 * API 客户端
 * - baseURL 默认本地后端 http://127.0.0.1:8082/api/v1
 * - Authorization: Bearer <token>
 * - 金额单位：分
 * - App.globalData.useMock=true 时走 mock（默认 false，联调本地 8082；可在「我的」开启 Mock）
 */
import { getStableDevKey } from '../utils/devKey'
import { mockApi, mockResetRole } from './mock'

const DEFAULT_BASE = 'http://127.0.0.1:8082/api/v1'

function getBaseURL(): string {
  try {
    const saved = wx.getStorageSync('API_BASE_URL')
    if (saved) return String(saved).replace(/\/$/, '')
  } catch (_e) {
    /* ignore */
  }
  return DEFAULT_BASE
}

function getToken(): string {
  try {
    return wx.getStorageSync('ACCESS_TOKEN') || ''
  } catch (_e) {
    return ''
  }
}

function useMock(): boolean {
  const app = getApp<IAppOption>()
  if (app && typeof app.globalData.useMock === 'boolean') {
    return app.globalData.useMock
  }
  try {
    const v = wx.getStorageSync('USE_MOCK')
    if (v === true || v === '1' || v === 1) return true
  } catch (_e) {
    /* ignore */
  }
  return false
}

function isBizSuccessCode(code: unknown): boolean {
  return code === 0 || code === '0'
}

/** 是否像鉴权成功体（用于 envelope 未按 number code 解包时的兜底） */
function looksLikeAuthPayload(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  const hasToken =
    (typeof o.accessToken === 'string' && o.accessToken.length > 0) ||
    (typeof o.token === 'string' && o.token.length > 0)
  return hasToken && o.user != null && typeof o.user === 'object'
}

/** 统一解包 `{ code, message, data }`；兼容 code 为字符串、或未走 number 分支的 envelope */
function unwrapApiSuccessBody<T>(body: unknown): T {
  if (body === null || body === undefined) {
    throw new Error('响应体为空')
  }
  if (typeof body !== 'object') {
    return body as T
  }
  const env = body as Record<string, unknown>
  const inner = env.data
  if (inner !== undefined && inner !== null && looksLikeAuthPayload(inner)) {
    return inner as T
  }
  if ('code' in env) {
    if (isBizSuccessCode(env.code)) {
      return env.data as T
    }
    if (env.code !== undefined && env.code !== null) {
      const message =
        typeof env.message === 'string' ? env.message : `业务错误 ${String(env.code)}`
      throw new Error(message)
    }
  }
  return body as T
}

function request<T>(
  method: string,
  path: string,
  data?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const url = `${getBaseURL()}${path.startsWith('/') ? path : '/' + path}`
  const token = getToken()
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: method as any,
      data: data as any,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(extraHeaders || {}),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(unwrapApiSuccessBody<T>(res.data))
          } catch (e) {
            reject(e)
          }
          return
        }
        reject(new Error(`HTTP ${res.statusCode}`))
      },
      fail(err) {
        reject(err)
      },
    })
  })
}

export const api = {
  getBaseURL,
  setBaseURL(url: string) {
    wx.setStorageSync('API_BASE_URL', url.replace(/\/$/, ''))
  },
  setUseMock(on: boolean) {
    wx.setStorageSync('USE_MOCK', on)
    try {
      getApp<IAppOption>().globalData.useMock = on
    } catch (_e) {
      /* ignore */
    }
  },
  /** 开发辅助：切换 mock 角色 */
  mockSwitchRole(role: UserRole) {
    mockResetRole(role)
  },

  /**
   * wx-login：身份由 devKey 决定（BE openid=mock_dev_<key>），code 仅占位。
   * Key 解析优先级（服务端）：body devKey → body mockOpenid → Header X-Dev-Key
   */
  async wxLogin(code: string) {
    const devKey = getStableDevKey()
    if (!devKey) {
      throw new Error('devKey 未初始化')
    }
    const loginCode = code || 'placeholder'
    if (useMock()) return mockApi.wxLogin(loginCode, devKey)
    return request<{
      accessToken: string
      expiresIn: number
      profileCompleted: boolean
      user: UserInfo
    }>('POST', '/auth/wx-login', { code: loginCode, devKey }, { 'X-Dev-Key': devKey })
  },

  async completeProfile(realName: string, phone: string) {
    if (useMock()) return mockApi.completeProfile(realName, phone)
    return request<{
      accessToken: string
      expiresIn?: number
      user: UserInfo
      profileCompleted: boolean
    }>('POST', '/auth/profile', {
      realName,
      phone,
    })
  },

  async me() {
    if (useMock()) return mockApi.me()
    return request<{ user: UserInfo; profileCompleted: boolean; role: UserRole }>('GET', '/auth/me')
  },

  async orderingConfig() {
    if (useMock()) return mockApi.orderingConfig()
    return request<OrderingConfig>('GET', '/config/ordering')
  },

  async listProducts() {
    if (useMock()) return mockApi.listProducts()
    return request<Product[] | { list: Product[] }>('GET', '/products').then((d) =>
      Array.isArray(d) ? d : d.list
    )
  },

  async listAllProducts() {
    if (useMock()) return mockApi.listAllProducts()
    return request<Product[] | { list: Product[] }>('GET', '/products?includeOffShelf=1').then((d) =>
      Array.isArray(d) ? d : d.list
    )
  },

  async createOrder(items: { productId: string; quantity: string }[], remark = '') {
    if (useMock()) return mockApi.createOrder(items, remark)
    return request<Order>('POST', '/orders', {
      idempotencyKey: `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      items,
      remark,
    })
  },

  async listMyOrders() {
    if (useMock()) return mockApi.listMyOrders()
    return request<Order[] | { list: Order[] }>('GET', '/orders').then((d) =>
      Array.isArray(d) ? d : d.list
    )
  },

  async getOrder(id: string) {
    if (useMock()) {
      const o = await mockApi.getOrder(id)
      if (!o) throw new Error('订单不存在')
      return o
    }
    return request<Order>('GET', `/orders/${id}`)
  },

  async cancelOrder(id: string) {
    if (useMock()) return mockApi.cancelOrder(id)
    return request<Order>('POST', `/orders/${id}/cancel`)
  },

  async createPay(id: string) {
    if (useMock()) {
      return { payMode: 'mock' as const, prepay: { mockTicket: id } }
    }
    return request<{ payMode: string; prepay: any }>('POST', `/orders/${id}/pay`)
  },

  async payMockSuccess(id: string) {
    if (useMock()) return mockApi.payMockSuccess(id)
    return request<Order>('POST', `/orders/${id}/pay/mock-success`)
  },

  async shopPreorderOrders(query?: Record<string, string>) {
    if (useMock()) return mockApi.shopPreorderOrders()
    const qs = query
      ? '?' +
        Object.keys(query)
          .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
          .join('&')
      : ''
    return request<Order[] | { list: Order[] }>('GET', `/shop/orders/preorder${qs}`).then((d) =>
      Array.isArray(d) ? d : d.list
    )
  },

  async shopManualOrders() {
    if (useMock()) return mockApi.shopManualOrders()
    return request<Order[] | { list: Order[] }>('GET', '/shop/orders/manual').then((d) =>
      Array.isArray(d) ? d : d.list
    )
  },

  async createManual(body: {
    realName: string
    phone: string
    pickupDate: string
    items: { productId: string; quantity: string }[]
    remark: string
    depositOffline: string
  }) {
    if (useMock()) return mockApi.createManual(body)
    return request<Order>('POST', '/shop/orders/manual', body)
  },

  async prepareOrder(id: string) {
    if (useMock()) return mockApi.prepareOrder(id)
    return request<Order>('POST', `/shop/orders/${id}/prepare`)
  },

  async pickupOrder(id: string, pickupCode: string) {
    if (useMock()) return mockApi.pickupOrder(id, pickupCode)
    return request<Order>('POST', `/shop/orders/${id}/pickup`, { pickupCode })
  },

  async shopCancel(id: string, reason: string) {
    if (useMock()) return mockApi.shopCancel(id, reason)
    return request<Order>('POST', `/shop/orders/${id}/cancel`, { reason })
  },

  async updateAdminConfig(body: Partial<OrderingConfig>) {
    if (useMock()) return mockApi.updateConfig(body)
    return request<OrderingConfig>('PUT', '/admin/config/ordering', body)
  },

  async setShelf(id: string, status: 'ON_SHELF' | 'OFF_SHELF') {
    if (useMock()) return mockApi.setShelf(id, status)
    return request<Product>('PATCH', `/admin/products/${id}/shelf`, { status })
  },

  async createProduct(body: {
    skuCode: string
    name: string
    unit: string
    priceFen: number
    remark?: string
    sort?: number
    status?: 'ON_SHELF' | 'OFF_SHELF'
  }) {
    if (useMock()) return mockApi.createProduct(body)
    return request<Product>('POST', '/admin/products', body)
  },

  async updateProduct(
    id: string,
    body: Partial<{
      name: string
      unit: string
      priceFen: number
      remark: string
      sort: number
      status: 'ON_SHELF' | 'OFF_SHELF'
    }>
  ) {
    if (useMock()) return mockApi.updateProduct(id, body)
    return request<Product>('PUT', `/admin/products/${id}`, body)
  },
}

export { DEFAULT_BASE }
