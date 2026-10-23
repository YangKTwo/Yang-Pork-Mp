/** 分 → 展示元 */
export function fenToYuan(fen: number): string {
  const n = (fen || 0) / 100
  return n.toFixed(2)
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
