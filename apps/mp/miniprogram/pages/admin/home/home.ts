Page({
  goProducts() {
    wx.navigateTo({ url: '/pages/admin/products/products' })
  },
  goConfig() {
    wx.navigateTo({ url: '/pages/admin/config/config' })
  },
  goSlotCapacity() {
    wx.navigateTo({ url: '/pages/admin/slot-capacity/slot-capacity?entry=admin_home' })
  },
  goWorkbench() {
    wx.reLaunch({ url: '/pages/shop/workbench/workbench' })
  },
})
