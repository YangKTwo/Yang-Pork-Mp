import { api } from '../../../services/api'
import { fenToYuan, yuanToFen } from '../../../utils/money'

type ProductForm = {
  skuCode: string
  name: string
  unit: string
  priceYuan: string
  remark: string
}

const emptyForm = (): ProductForm => ({
  skuCode: '',
  name: '',
  unit: '斤',
  priceYuan: '',
  remark: '',
})

Page({
  data: {
    list: [] as any[],
    showForm: false,
    formMode: 'create' as 'create' | 'edit',
    editingId: '',
    form: emptyForm(),
    formLoading: false,
    canSubmitForm: false,
  },
  async onShow() {
    await this.reload()
  },
  async reload() {
    const products = await api.listAllProducts()
    this.setData({
      list: products.map((p) => ({ ...p, priceYuan: fenToYuan(p.priceFen) })),
    })
  },
  openCreate() {
    this.setData({
      showForm: true,
      formMode: 'create',
      editingId: '',
      form: emptyForm(),
      canSubmitForm: false,
    })
  },
  openEdit(e: any) {
    const { id } = e.currentTarget.dataset
    const item = this.data.list.find((x) => x.id === id)
    if (!item) return
    this.setData({
      showForm: true,
      formMode: 'edit',
      editingId: id,
      form: {
        skuCode: item.skuCode,
        name: item.name,
        unit: item.unit,
        priceYuan: fenToYuan(item.priceFen),
        remark: item.remark || '',
      },
    })
    this.refreshFormValid()
  },
  closeForm() {
    this.setData({ showForm: false })
  },
  onFormField(e: any) {
    const k = e.currentTarget.dataset.k as keyof ProductForm
    const form = { ...this.data.form, [k]: e.detail.value }
    this.setData({ form })
    this.refreshFormValid(form)
  },
  refreshFormValid(form?: ProductForm) {
    const f = form || this.data.form
    const { formMode } = this.data
    const priceOk = yuanToFen(f.priceYuan) > 0
    const baseOk = !!f.name.trim() && !!f.unit.trim() && priceOk
    const canSubmit =
      formMode === 'create'
        ? baseOk && !!f.skuCode.trim()
        : baseOk
    this.setData({ canSubmitForm: canSubmit })
  },
  async submitForm() {
    if (!this.data.canSubmitForm || this.data.formLoading) return
    const { formMode, editingId, form } = this.data
    const priceFen = yuanToFen(form.priceYuan)
    if (priceFen <= 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' })
      return
    }
    this.setData({ formLoading: true })
    try {
      if (formMode === 'create') {
        await api.createProduct({
          skuCode: form.skuCode.trim(),
          name: form.name.trim(),
          unit: form.unit.trim(),
          priceFen,
          remark: form.remark.trim() || undefined,
          status: 'ON_SHELF',
        })
        wx.showToast({ title: '已创建', icon: 'success' })
      } else {
        await api.updateProduct(editingId, {
          name: form.name.trim(),
          unit: form.unit.trim(),
          priceFen,
          remark: form.remark.trim(),
        })
        wx.showToast({ title: '已保存', icon: 'success' })
      }
      this.setData({ showForm: false })
      await this.reload()
    } catch (err: any) {
      wx.showToast({ title: err.message || '失败', icon: 'none' })
    } finally {
      this.setData({ formLoading: false })
    }
  },
  async toggleShelf(e: any) {
    const { id, status } = e.currentTarget.dataset
    try {
      await api.setShelf(id, status)
      await this.reload()
      wx.showToast({ title: '已更新', icon: 'success' })
    } catch (err: any) {
      wx.showToast({ title: err.message || '失败', icon: 'none' })
    }
  },
  confirmShelfOff(e: any) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '下架商品',
      content: `确定下架「${name}」？顾客端将不再展示（可稍后重新上架）。`,
      confirmText: '下架',
      success: (res) => {
        if (res.confirm) {
          this.toggleShelf({ currentTarget: { dataset: { id, status: 'OFF_SHELF' } } })
        }
      },
    })
  },
  noop() {},
})
