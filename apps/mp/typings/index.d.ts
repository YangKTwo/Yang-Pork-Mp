/// <reference path="./wx.d.ts" />

interface IAppOption {
  globalData: {
    userInfo: UserInfo | null
    accessToken: string
    role: UserRole | null
    profileCompleted: boolean
    useMock: boolean
  }
  ensureSession: () => Promise<void>
  setSession: (token: string, user: UserInfo, profileCompleted: boolean) => void
  applyAuthResponse: (
    data:
      | {
          accessToken?: string
          user: UserInfo
          profileCompleted?: boolean
        }
      | Record<string, unknown>
  ) => void
  clearSession: () => void
  routeByRole: () => void
}

type UserRole = 'CUSTOMER' | 'SHOP' | 'ADMIN'

interface UserInfo {
  id: string
  role: UserRole
  nickname: string | null
  phone: string | null
  realName: string | null
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface Product {
  id: string
  skuCode: string
  name: string
  unit: string
  priceFen: number
  status: 'ON_SHELF' | 'OFF_SHELF'
  remark: string
  sort: number
}

interface OrderingConfig {
  timezone: string
  orderWindowStart: string
  orderWindowEnd: string
  cancelDeadline: string
  pickupDayOffset: number
  depositThresholdFen: number
  depositRateBps: number
  payTimeoutSec: number
  depositFormulaText: string
  canOrderNow: boolean
  serverNow: string
  nextPickupDate: string
}

interface OrderItem {
  productId: string
  name: string
  unit: string
  quantity: string
  priceFen: number
  lineFen?: number
  lineTotalFen?: number
}

interface Order {
  id: string
  source: 'PREORDER' | 'MANUAL'
  status: string
  pickupDate: string
  totalFen: number
  depositFen: number
  depositRequired: boolean
  depositFormulaText: string
  payExpireAt: string | null
  pickupCode: string | null
  items: OrderItem[]
  realName?: string
  phone?: string
  remark?: string
  cancelReason?: string
  depositOffline?: string
}

interface CartLine {
  product: Product
  quantity: number
}
