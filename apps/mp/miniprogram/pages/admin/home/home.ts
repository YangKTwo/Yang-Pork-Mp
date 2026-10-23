Page({
  goProducts() {
    wx.navigateTo({ url: '/pages/admin/products/products' })
  },
  goConfig() {
    wx.navigateTo({ url: '/pages/admin/config/config' })
  },
  goWorkbench() {
    wx.reLaunch({ url: '/pages/shop/workbench/workbench' })
  },
})
