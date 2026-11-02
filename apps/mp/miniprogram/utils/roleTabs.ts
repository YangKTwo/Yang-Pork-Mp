export type RoleTab = { key: string; label: string; icon: string; on: boolean }

export function customerTabs(current: 'home' | 'orders' | 'me'): RoleTab[] {
  return [
    { key: 'home', label: '商品', icon: '⌂', on: current === 'home' },
    { key: 'orders', label: '订单', icon: '☰', on: current === 'orders' },
    { key: 'me', label: '我的', icon: '☺', on: current === 'me' },
  ]
}

export function shopTabs(current: 'workbench' | 'me', isAdmin: boolean): RoleTab[] {
  const tabs: RoleTab[] = [
    { key: 'workbench', label: '工作台', icon: '▦', on: current === 'workbench' },
  ]
  if (isAdmin) {
    tabs.push({ key: 'admin', label: '管理', icon: '⚙', on: false })
  }
  tabs.push({ key: 'me', label: '我的', icon: '☺', on: current === 'me' })
  return tabs
}
