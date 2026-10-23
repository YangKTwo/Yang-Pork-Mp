import { api } from '../../../services/api'
import { addToCart, loadCart, cartTotalFen } from '../../../utils/cart'
import { fenToYuan } from '../../../utils/money'
import { track, TrackEvents } from '../../../utils/tracking/index'

Page({
  data: {
    products: [] as any[],
    config: {} as any,
    drawerOpen: false,
    drawerProduct: null as any,
    qty: 1,
    drawerStep: 1,
    drawerMin: 1,
    drawerDecimal: 0,
    lineYuan: '0.00',
    cartCount: 0,
    cartYuan: '0.00',
    cartPriceFen: 0,
  },
  _viewed: false,
  async onShow() {
    await this.refresh()
    if (!this._viewed) {
      this._viewed = true
      track(TrackEvents.PRODUCT_LIST_VIEW, {
        sku_count: this.data.products.length,
        can_order_now: !!this.data.config.canOrderNow,
        list_source: 'mock',
      }, 'C-HOME-01')
    }
  },
  async refresh() {
    try {
      const [products, config] = await Promise.all([api.listProducts(), api.orderingConfig()])
      const list = products.map((p) => ({ ...p, priceYuan: fenToYuan(p.priceFen) }))
      const cart = loadCart()
      this.setData({
        products: list,
        config,
        cartCount: cart.length,
        cartYuan: fenToYuan(cartTotalFen(cart)),
        cartPriceFen: cartTotalFen(cart),
      })
    } catch (e: any) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },
  openDrawer(e: any) {
    const id = e.currentTarget.dataset.id
    const p = this.data.products.find((x: any) => x.id === id)
    if (!p) return
    if (!this.data.config.canOrderNow) {
      track(TrackEvents.ORDER_WINDOW_BLOCK, { can_order_now: false }, 'C-WIN-01')
      wx.showToast({ title: '当前不在下单窗口', icon: 'none' })
      return
    }
    const step = p.unit === '斤' ? 0.5 : 1
    const qty = step
    track(TrackEvents.PRODUCT_ADD_DRAWER_OPEN, {
      sku_id: p.id,
      sku_code: p.skuCode,
      product_name: p.name,
      unit: p.unit,
      price_fen: p.priceFen,
    }, 'C-HOME-02')
    this.setData({
      drawerOpen: true,
      drawerProduct: p,
      qty,
      drawerStep: step,
      drawerMin: step,
      drawerDecimal: p.unit === '斤' ? 1 : 0,
      lineYuan: fenToYuan(Math.round(p.priceFen * qty)),
    })
  },
  closeDrawer() {
    this.setData({ drawerOpen: false })
  },
  onQtyChange(e: any) {
    const p = this.data.drawerProduct
    if (!p) return
    const qty = Number(e.detail)
    this.setData({ qty, lineYuan: fenToYuan(Math.round(p.priceFen * qty)) })
  },
  addCart() {
    const p = this.data.drawerProduct
    if (!p) return
    const qty = this.data.qty
    addToCart(p, qty)
    track(TrackEvents.CART_ADD, {
      sku_id: p.id,
      sku_code: p.skuCode,
      qty,
      price_fen: p.priceFen,
      unit: p.unit,
      line_amount_fen: Math.round(p.priceFen * qty),
    }, 'C-HOME-02')
    const cart = loadCart()
    this.setData({
      drawerOpen: false,
      cartCount: cart.length,
      cartYuan: fenToYuan(cartTotalFen(cart)),
      cartPriceFen: cartTotalFen(cart),
    })
    wx.showToast({ title: '已加入', icon: 'success' })
  },
  goConfirm() {
    if (!this.data.config.canOrderNow) {
      track(TrackEvents.ORDER_WINDOW_BLOCK, { can_order_now: false }, 'C-WIN-01')
      wx.showToast({ title: '当前不在下单窗口', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/customer/confirm/confirm' })
  },
  goOrders() {
    wx.navigateTo({ url: '/pages/customer/orders/orders' })
  },
  goMe() {
    wx.navigateTo({ url: '/pages/customer/me/me' })
  },
})
