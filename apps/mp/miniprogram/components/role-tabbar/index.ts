Component({
  properties: {
    tabs: { type: Array, value: [] },
  },
  methods: {
    onTap(e: { currentTarget: { dataset: { key?: string } } }) {
      const key = String(e.currentTarget.dataset.key || '')
      if (!key) return
      const host = this as unknown as { triggerEvent: (name: string, detail?: Record<string, unknown>) => void }
      host.triggerEvent('select', { key })
    },
  },
})
