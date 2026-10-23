import { api } from '../../../services/api'
import { fenToYuan, yuanToFen } from '../../../utils/money'

const UNIT_OPTIONS = ['斤', '条', '只', '份']

type ProductForm = {
  name: string
  unit: string
  priceYuan: string
  remark: string
}

const emptyForm = (): ProductForm => ({
  name: '',
  unit: '斤',
  priceYuan: '',
  remark: '',
})

function unitIndexOf(unit: string): number {
  const i = UNIT_OPTIONS.indexOf(unit)
  return i >= 0 ? i : 0
}

function genSkuCode(): string {
  return `N${Date.now().toString(36).toUpperCase().slice(-8)}`
}

Page({
  data: {
    list: [] as any[],
    unitOptions: UNIT_OPTIONS,
    showForm: false,
    formMode: 'create' as 'create' | 'edit',
    editingId: '',
    form: emptyForm(),
    unitIndex: 0,
    onShelf: false,
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
      unitIndex: 0,
      onShelf: false,
      canSubmitForm: false,
    })
  },
  openEdit(e: any) {
    const { id } = e.currentTarget.dataset
    const item = this.data.list.find((x) => x.id === id)
    if (!item) return
    const unit = item.unit || '斤'
    this.setData({
      showForm: true,
      formMode: 'edit',
      editingId: id,
      form: {
        name: item.name,
        unit,
        priceYuan: fenToYuan(item.priceFen),
        remark: item.remark || '',
      },
      unitIndex: unitIndexOf(unit),
      onShelf: item.status === 'ON_SHELF',
    })
    this.refreshFormValid()
  },
  closeForm() {
    this.setData({ showForm: false })
  },
  onFormField(e: any) {
    const k = e.currentTarget.dataset.k as keyof ProductForm
    const form = { ...this.data.form, [k]: String(e.detail || '') }
    this.setData({ form })
    this.refreshFormValid(form)
  },
  onUnitPick(e: any) {
    const idx = Number(e.detail.value)
    const unit = UNIT_OPTIONS[idx] || '斤'
    const form = { ...this.data.form, unit }
    this.setData({ unitIndex: idx, form })
    this.refreshFormValid(form)
  },
  onShelfSwitch(e: any) {
    this.setData({ onShelf: !!e.detail.value })
  },
  refreshFormValid(form?: ProductForm) {
    const f = form || this.data.form
    const priceOk = yuanToFen(f.priceYuan) > 0
    const canSubmit = !!f.name.trim() && !!f.unit.trim() && priceOk
    this.setData({ canSubmitForm: canSubmit })
  },
  shelfStatus(): 'ON_SHELF' | 'OFF_SHELF' {
    return this.data.onShelf ? 'ON_SHELF' : 'OFF_SHELF'
  },
  async persistForm(forceOffShelf = false) {
    const { formMode, editingId, form } = this.data
    const priceFen = yuanToFen(form.priceYuan)
    if (priceFen <= 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' })
      return false
    }
    const status: 'ON_SHELF' | 'OFF_SHELF' = forceOffShelf
      ? 'OFF_SHELF'
      : this.shelfStatus()
    if (formMode === 'create') {
      await api.createProduct({
        skuCode: genSkuCode(),
        name: form.name.trim(),
        unit: form.unit.trim(),
        priceFen,
        remark: form.remark.trim() || undefined,
        status,
      })
    } else {
      await api.updateProduct(editingId, {
        name: form.name.trim(),
        unit: form.unit.trim(),
        priceFen,
        remark: form.remark.trim(),
        status,
      })
    }
    return true
  },
  async submitForm() {
    if (!this.data.canSubmitForm || this.data.formLoading) return
    this.setData({ formLoading: true })
    try {
      const ok = await this.persistForm(false)
      if (!ok) return
      wx.showToast({ title: '已保存', icon: 'success' })
      this.setData({ showForm: false })
      await this.reload()
    } catch (err: any) {
      wx.showToast({ title: err.message || '失败', icon: 'none' })
    } finally {
      this.setData({ formLoading: false })
    }
  },
  async shelfOffAndSave() {
    if (!this.data.canSubmitForm || this.data.formLoading) return
    if (this.data.formMode !== 'edit') return
    this.setData({ formLoading: true })
    try {
      const ok = await this.persistForm(true)
      if (!ok) return
      wx.showToast({ title: '已下架并保存', icon: 'success' })
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
  noop() {},
})
