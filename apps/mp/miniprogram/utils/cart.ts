const KEY = 'CART_LINES'

export function loadCart(): CartLine[] {
  try {
    const raw = wx.getStorageSync(KEY)
    return Array.isArray(raw) ? raw : []
  } catch (_e) {
    return []
  }
}

export function saveCart(lines: CartLine[]) {
  wx.setStorageSync(KEY, lines)
}

export function clearCart() {
  wx.removeStorageSync(KEY)
}

export function addToCart(product: Product, quantity: number) {
  const lines = loadCart()
  const i = lines.findIndex((l) => l.product.id === product.id)
  if (i >= 0) {
    lines[i].quantity = Number((lines[i].quantity + quantity).toFixed(1))
  } else {
    lines.push({ product, quantity })
  }
  saveCart(lines)
  return lines
}

export function cartTotalFen(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + Math.round(l.product.priceFen * l.quantity), 0)
}
