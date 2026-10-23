/** 登录 / 完善资料成功后统一落库 accessToken（A-AUTH-02） */
export type AuthPayload = {
  accessToken?: string
  user: UserInfo
  profileCompleted: boolean
}

export function applyAuthResponse(app: IAppOption, data: AuthPayload): void {
  if (!data.accessToken) {
    throw new Error('响应缺少 accessToken')
  }
  app.setSession(data.accessToken, data.user, data.profileCompleted)
}
