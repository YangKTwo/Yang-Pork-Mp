/** 本地假数据：无后端时可点通主路径。金额单位：分。 */

const PRODUCTS: Product[] = [
  { id: 'prod_p01', skuCode: 'P01', name: '精瘦肉', unit: '斤', priceFen: 1500, status: 'ON_SHELF', remark: '炒菜常用', sort: 10 },
  { id: 'prod_p02', skuCode: 'P02', name: '前腿肉', unit: '斤', priceFen: 1200, status: 'ON_SHELF', remark: '', sort: 20 },
  { id: 'prod_p03', skuCode: 'P03', name: '五花肉', unit: '斤', priceFen: 1300, status: 'ON_SHELF', remark: '', sort: 30 },
  { id: 'prod_r01', skuCode: 'R01', name: '肋排（一条）', unit: '条', priceFen: 3200, status: 'ON_SHELF', remark: '约 1.2–1.5 斤/条', sort: 40 },
  { id: 'prod_o01', skuCode: 'O01', name: '猪蹄', unit: '只', priceFen: 1800, status: 'ON_SHELF', remark: '', sort: 50 },
  { id: 'prod_o03', skuCode: 'O03', name: '排骨（块）', unit: '斤', priceFen: 2800, status: 'ON_SHELF', remark: '', sort: 60 },
]

function tomorrowDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nowIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const oh = pad(Math.floor(Math.abs(offset) / 60))
  const om = pad(Math.abs(offset) % 60)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${oh}:${om}`
}

function genPickupCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

let mockUser: UserInfo = {
  id: 'u_mock_customer',
  role: 'CUSTOMER',
  nickname: null,
  phone: null,
  realName: null,
}
let profileCompleted = false
let accessToken = 'mock_token_customer'
const orders: Order[] = []

export function mockResetRole(role: UserRole) {
  mockUser = {
    id: `u_mock_${role.toLowerCase()}`,
    role,
    nickname: role === 'CUSTOMER' ? null : `${role}演示`,
    phone: role === 'CUSTOMER' ? null : '13800000000',
    realName: role === 'CUSTOMER' ? null : '演示账号',
  }
  profileCompleted = role !== 'CUSTOMER'
  accessToken = `mock_token_${role.toLowerCase()}`
}

export const mockApi = {
  async wxLogin(_code: string) {
    return {
      accessToken,
      expiresIn: 7200,
      profileCompleted,
      user: { ...mockUser },
    }
  },

  async completeProfile(realName: string, phone: string) {
    mockUser = {
      ...mockUser,
      realName,
      phone,
      nickname: `${realName}${phone}`,
    }
    profileCompleted = true
    accessToken = `mock_token_${mockUser.role.toLowerCase()}_profile`
    return {
      accessToken,
      expiresIn: 7200,
      user: { ...mockUser },
      profileCompleted: true,
    }
  },

  async me() {
    return { user: { ...mockUser }, profileCompleted, role: mockUser.role }
  },

  async orderingConfig(): Promise<OrderingConfig> {
    const hour = new Date().getHours()
    const canOrderNow = hour >= 12 && hour < 22
    return {
      timezone: 'Asia/Shanghai',
      orderWindowStart: '12:00',
      orderWindowEnd: '22:00',
      cancelDeadline: '22:00',
      pickupDayOffset: 1,
      depositThresholdFen: 1000,
      depositRateBps: 2000,
      payTimeoutSec: 600,
      depositFormulaText: '定金 = 订单金额 × 20%（订单满 10 元收取）',
      canOrderNow,
      serverNow: nowIso(),
      nextPickupDate: tomorrowDate(),
    }
  },

  async listProducts(): Promise<Product[]> {
    return PRODUCTS.filter((p) => p.status === 'ON_SHELF').sort((a, b) => a.sort - b.sort)
  },

  async listAllProducts(): Promise<Product[]> {
    return [...PRODUCTS].sort((a, b) => a.sort - b.sort)
  },

  async createOrder(items: { productId: string; quantity: string }[], remark: string): Promise<Order> {
    const cfg = await this.orderingConfig()
    const lines: OrderItem[] = items.map((it) => {
      const p = PRODUCTS.find((x) => x.id === it.productId)!
      const q = parseFloat(it.quantity)
      const lineFen = Math.round(p.priceFen * q)
      return {
        productId: p.id,
        name: p.name,
        unit: p.unit,
        quantity: it.quantity,
        priceFen: p.priceFen,
        lineFen,
      }
    })
    const totalFen = lines.reduce((s, l) => s + (l.lineFen ?? 0), 0)
    const depositRequired = totalFen > cfg.depositThresholdFen
    const depositFen = depositRequired
      ? Math.round((totalFen * cfg.depositRateBps) / 10000)
      : 0
    const status = depositRequired ? 'PENDING_PAY' : 'PENDING_PREPARE'
    const expire = new Date(Date.now() + cfg.payTimeoutSec * 1000)
    const order: Order = {
      id: `ord_mock_${Date.now()}`,
      source: 'PREORDER',
      status,
      pickupDate: cfg.nextPickupDate,
      totalFen,
      depositFen,
      depositRequired,
      depositFormulaText: cfg.depositFormulaText,
      payExpireAt: depositRequired ? expire.toISOString() : null,
      pickupCode: depositRequired ? null : genPickupCode(),
      items: lines,
      realName: mockUser.realName || undefined,
      phone: mockUser.phone || undefined,
      remark,
    }
    orders.unshift(order)
    return order
  },

  async listMyOrders(): Promise<Order[]> {
    return orders.filter((o) => o.source === 'PREORDER')
  },

  async getOrder(id: string): Promise<Order | null> {
    return orders.find((o) => o.id === id) || null
  },

  async cancelOrder(id: string): Promise<Order> {
    const o = orders.find((x) => x.id === id)
    if (!o) throw new Error('订单不存在')
    o.status = 'CANCELLED'
    return o
  },

  async payMockSuccess(id: string): Promise<Order> {
    const o = orders.find((x) => x.id === id)
    if (!o) throw new Error('订单不存在')
    o.status = 'PENDING_PREPARE'
    o.pickupCode = genPickupCode()
    o.payExpireAt = null
    return o
  },

  async shopPreorderOrders(): Promise<Order[]> {
    return orders.filter((o) => o.source === 'PREORDER')
  },

  async shopManualOrders(): Promise<Order[]> {
    return orders.filter((o) => o.source === 'MANUAL')
  },

  async createManual(body: {
    realName: string
    phone: string
    pickupDate: string
    items: { productId: string; quantity: string }[]
    remark: string
    depositOffline: string
  }): Promise<Order> {
    const lines: OrderItem[] = body.items.map((it) => {
      const p = PRODUCTS.find((x) => x.id === it.productId)!
      const q = parseFloat(it.quantity)
      return {
        productId: p.id,
        name: p.name,
        unit: p.unit,
        quantity: it.quantity,
        priceFen: p.priceFen,
        lineFen: Math.round(p.priceFen * q),
      }
    })
    const totalFen = lines.reduce((s, l) => s + (l.lineFen ?? 0), 0)
    const order: Order = {
      id: `ord_manual_${Date.now()}`,
      source: 'MANUAL',
      status: 'PENDING_PREPARE',
      pickupDate: body.pickupDate,
      totalFen,
      depositFen: 0,
      depositRequired: false,
      depositFormulaText: '',
      payExpireAt: null,
      pickupCode: genPickupCode(),
      items: lines,
      realName: body.realName,
      phone: body.phone,
      remark: body.remark,
      depositOffline: body.depositOffline,
    }
    orders.unshift(order)
    return order
  },

  async prepareOrder(id: string): Promise<Order> {
    const o = orders.find((x) => x.id === id)
    if (!o) throw new Error('订单不存在')
    o.status = 'PREPARED'
    return o
  },

  async pickupOrder(id: string, _code: string): Promise<Order> {
    const o = orders.find((x) => x.id === id)
    if (!o) throw new Error('订单不存在')
    o.status = 'PICKED_UP'
    return o
  },

  async shopCancel(id: string, reason: string): Promise<Order> {
    const o = orders.find((x) => x.id === id)
    if (!o) throw new Error('订单不存在')
    if (!reason || !reason.trim()) throw new Error('取消原因必填')
    o.status = 'CANCELLED'
    o.cancelReason = reason.trim()
    return o
  },

  async updateConfig(partial: Partial<OrderingConfig>): Promise<OrderingConfig> {
    const base = await this.orderingConfig()
    return { ...base, ...partial }
  },

  async setShelf(id: string, status: 'ON_SHELF' | 'OFF_SHELF'): Promise<Product> {
    const p = PRODUCTS.find((x) => x.id === id)
    if (!p) throw new Error('商品不存在')
    p.status = status
    return { ...p }
  },

  async createProduct(body: {
    skuCode: string
    name: string
    unit: string
    priceFen: number
    remark?: string
    sort?: number
    status?: 'ON_SHELF' | 'OFF_SHELF'
  }): Promise<Product> {
    const id = `prod_${body.skuCode.toLowerCase()}_${Date.now()}`
    const p: Product = {
      id,
      skuCode: body.skuCode,
      name: body.name,
      unit: body.unit,
      priceFen: body.priceFen,
      status: body.status || 'ON_SHELF',
      remark: body.remark || '',
      sort: body.sort ?? PRODUCTS.length * 10 + 10,
    }
    PRODUCTS.push(p)
    return { ...p }
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
  ): Promise<Product> {
    const p = PRODUCTS.find((x) => x.id === id)
    if (!p) throw new Error('商品不存在')
    if (body.name != null) p.name = body.name
    if (body.unit != null) p.unit = body.unit
    if (body.priceFen != null) p.priceFen = body.priceFen
    if (body.remark != null) p.remark = body.remark
    if (body.sort != null) p.sort = body.sort
    if (body.status != null) p.status = body.status
    return { ...p }
  },
}
