Component({
  properties: {
    options: { type: Array, value: [] },
    value: { type: String, value: '' },
    hint: { type: String, value: '' },
    /** select：下单必选，满档不可选；filter：列表筛选，满档只展示 Tag */
    mode: { type: String, value: 'select' },
  },
  methods: {
    onTap(e: { currentTarget: { dataset: { slot?: string; full?: boolean } } }) {
      const slot = String(e.currentTarget.dataset.slot || '')
      const full = !!e.currentTarget.dataset.full
      const host = this as unknown as { triggerEvent: (name: string, detail?: Record<string, unknown>) => void }
      host.triggerEvent('pick', { slot, full })
    },
  },
})
