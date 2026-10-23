/** 登录 / 完善资料成功后统一落库 accessToken（A-AUTH-02） */
import { coerceAuthPayload, formatMissingAccessTokenDiagnostic } from './apiEnvelope'

export type AuthPayload = {
  accessToken?: string
  user: UserInfo
  profileCompleted: boolean
}

export function applyAuthResponse(app: IAppOption, data: AuthPayload | Record<string, unknown>): void {
  const payload = coerceAuthPayload(data)
  const token = payload.accessToken
  if (!token) {
    throw new Error(formatMissingAccessTokenDiagnostic(data))
  }
  app.setSession(token, payload.user, payload.profileCompleted)
}
