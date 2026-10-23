/** 登录 / 完善资料成功后统一落库 accessToken（A-AUTH-02） */
export type AuthPayload = {
  accessToken?: string
  user: UserInfo
  profileCompleted: boolean
}

export function applyAuthResponse(app: IAppOption, data: AuthPayload): void {
  const token = data.accessToken
  if (!token) {
    const keys = Object.keys((data as object) || {}).join(',') || '无'
    throw new Error(`响应缺少 accessToken（顶层字段: ${keys}）`)
  }
  app.setSession(token, data.user, data.profileCompleted)
}
