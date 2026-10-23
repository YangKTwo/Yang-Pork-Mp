/** 分 → 展示元 */
export function fenToYuan(fen: number | null | undefined): string {
  const raw = fen == null || Number.isNaN(Number(fen)) ? 0 : Number(fen)
  return (raw / 100).toFixed(2)
}

/** 元字符串 → 分（支持两位小数） */
export function yuanToFen(yuan: string | number): number {
  const n = typeof yuan === 'number' ? yuan : parseFloat(String(yuan).trim())
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100)
}

/** 订单行小计（分），兼容 API 的 lineFen / lineTotalFen */
export function getLineTotalFen(item: {
  lineFen?: number
  lineTotalFen?: number
}): number {
  const a = item.lineTotalFen
  const b = item.lineFen
  if (typeof a === 'number' && Number.isFinite(a)) return a
  if (typeof b === 'number' && Number.isFinite(b)) return b
  return 0
}

export function lineItemYuan(item: { lineFen?: number; lineTotalFen?: number }): string {
  return fenToYuan(getLineTotalFen(item))
}

export function formatYuan(fen: number): string {
  return `¥${fenToYuan(fen)}`
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING_PAY: '待支付',
    PENDING_PREPARE: '待备货',
    PREPARED: '已备货',
    PICKED_UP: '已取货',
    CANCELLED: '已取消',
    CLOSED: '已关闭',
  }
  return map[status] || status
}
