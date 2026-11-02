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

type PickupSlot = 'MORNING' | 'NOON' | 'EVENING'

type SubscribeStatus =
  | 'NONE'
  | 'ACCEPTED'
  | 'SENT'
  | 'SKIPPED_NO_AUTH'
  | 'FAILED'

interface OrderingPickupSlot {
  code: PickupSlot
  label: string
  hint: string
  /** F-SLOT-02：默认 30，由服务端计算 */
  capacity?: number
  occupied?: number
  remaining?: number
  full?: boolean
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
  /** F-SLOT-02：与 pickupDate 查询参数一致，用于展示/埋点 */
  pickupDateForSlots?: string
  pickupSlots?: OrderingPickupSlot[]
  defaultPickupSlot?: PickupSlot
  /** F-SUB-01：空字符串时 FE 跳过订阅授权 */
  subscribePreparedTmplId?: string
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
  /** F-SLOT-01：MORNING|NOON|EVENING；迁移期历史单可能 null */
  pickupSlot?: PickupSlot | null
  subscribeStatus?: SubscribeStatus
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
  /** F-NOSHOW-01：CLOSED 时关单原因 */
  closeReason?: 'PAY_TIMEOUT' | 'NO_PICKUP' | 'SLOT_FULL_ON_PAY' | null
  closedAt?: string | null
}

interface CartLine {
  product: Product
  quantity: number
}
