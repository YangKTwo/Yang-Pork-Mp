declare namespace WechatMiniprogram {
  interface IAnyObject {
    [key: string]: any
  }
  type PageLifeTime = {
    onLoad?: (query: Record<string, string | undefined>) => void
    onShow?: () => void
    onReady?: () => void
    onHide?: () => void
    onUnload?: () => void
  }
  type PageInstance<D, T> = {
    data: D
    setData: (data: Partial<D> | WechatMiniprogram.IAnyObject, cb?: () => void) => void
    route?: string
  } & T & PageLifeTime
  type PageConstructor = <D extends IAnyObject, T extends IAnyObject>(
    options: Partial<PageInstance<D, T>> & ThisType<PageInstance<D, T>> & {
      data?: D
      methods?: T
    } & T
  ) => void
  type AppInstance<T> = T & {
    onLaunch?: (options?: any) => void
    onShow?: (options?: any) => void
  }
  type AppConstructor = <T extends IAnyObject>(
    options: AppInstance<T> & ThisType<AppInstance<T>>
  ) => void
}

declare const App: WechatMiniprogram.AppConstructor
declare const Page: WechatMiniprogram.PageConstructor
declare const Component: any
declare const getApp: <T = IAppOption>() => T
declare const getCurrentPages: () => any[]

declare namespace wx {
  function login(opt: { success?: (res: { code: string }) => void; fail?: (e: any) => void }): void
  function request(opt: {
    url: string
    method?: string
    data?: any
    header?: Record<string, string>
    success?: (res: { statusCode: number; data: any }) => void
    fail?: (e: any) => void
  }): void
  function setStorageSync(key: string, data: any): void
  function getStorageSync(key: string): any
  function removeStorageSync(key: string): void
  function showToast(opt: { title: string; icon?: string; duration?: number }): void
  function showLoading(opt?: { title?: string; mask?: boolean }): void
  function hideLoading(): void
  function showModal(opt: {
    title?: string
    content?: string
    showCancel?: boolean
    confirmText?: string
    cancelText?: string
    success?: (res: { confirm: boolean; cancel: boolean }) => void
  }): void
  function navigateTo(opt: { url: string }): void
  function redirectTo(opt: { url: string }): void
  function reLaunch(opt: { url: string }): void
  function switchTab(opt: { url: string }): void
  function navigateBack(opt?: { delta?: number }): void
  function setNavigationBarTitle(opt: { title: string }): void
}
