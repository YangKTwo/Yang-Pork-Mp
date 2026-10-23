/** 统一解析 / 解包 API 响应（供 request 与 applyAuthResponse 共用） */

export function isBizSuccessCode(code: unknown): boolean {
  return code === 0 || code === '0'
}

export function parseApiBody(raw: unknown): unknown {
  let current = raw
  for (let depth = 0; depth < 3; depth++) {
    if (typeof current !== 'string') {
      return current
    }
    const trimmed = current.trim()
    if (!trimmed) {
      throw new Error('响应体为空字符串')
    }
    try {
      current = JSON.parse(trimmed)
    } catch {
      throw new Error('响应体 JSON 解析失败')
    }
  }
  if (typeof current === 'string') {
    throw new Error('响应体嵌套 JSON 字符串过深')
  }
  return current
}

function pickAccessToken(o: Record<string, unknown>): string | undefined {
  const primary = o.accessToken
  if (typeof primary === 'string' && primary.length > 0) {
    return primary
  }
  const alias = o.token
  if (typeof alias === 'string' && alias.length > 0) {
    return alias
  }
  return undefined
}

/** 是否像鉴权成功体（用于 envelope 未按 number code 解包时的兜底） */
export function looksLikeAuthPayload(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  const hasToken = !!pickAccessToken(o)
  return hasToken && o.user != null && typeof o.user === 'object'
}

/** 统一解包 `{ code, message, data }`；兼容 code 为字符串、data 为 JSON 字符串 */
export function unwrapApiSuccessBody<T>(body: unknown): T {
  const parsed = parseApiBody(body)
  if (parsed === null || parsed === undefined) {
    throw new Error('响应体为空')
  }
  if (typeof parsed !== 'object') {
    return parsed as T
  }
  const env = parsed as Record<string, unknown>
  const innerRaw = env.data
  if (innerRaw !== undefined && innerRaw !== null) {
    const inner = parseApiBody(innerRaw)
    if (looksLikeAuthPayload(inner)) {
      return inner as T
    }
  }
  if ('code' in env) {
    if (isBizSuccessCode(env.code)) {
      const data = parseApiBody(env.data)
      if (data !== undefined && data !== null) {
        return data as T
      }
      return env.data as T
    }
    if (env.code !== undefined && env.code !== null) {
      const message =
        typeof env.message === 'string' ? env.message : `业务错误 ${String(env.code)}`
      throw new Error(message)
    }
  }
  return parsed as T
}

/** 鉴权响应缺少 token 时的诊断（不输出 token 值） */
export function formatMissingAccessTokenDiagnostic(raw: unknown): string {
  const typeofTop = raw === null ? 'null' : typeof raw
  let hasDataField = false
  let hasNestedDataData = false
  let codeType = '无'
  let accessTokenType = '无'
  let accessTokenLen = 0
  let tokenAliasType = '无'

  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    hasDataField = 'data' in o && o.data !== undefined && o.data !== null
    if (hasDataField && o.data && typeof o.data === 'object') {
      const inner = o.data as Record<string, unknown>
      hasNestedDataData = 'data' in inner && inner.data !== undefined && inner.data !== null
    }
    if ('code' in o) {
      codeType = o.code === null ? 'null' : typeof o.code
    }
    if ('accessToken' in o) {
      accessTokenType = o.accessToken === null ? 'null' : typeof o.accessToken
      if (typeof o.accessToken === 'string') {
        accessTokenLen = o.accessToken.length
      }
    }
    if ('token' in o) {
      tokenAliasType = o.token === null ? 'null' : typeof o.token
    }
  }

  return (
    `响应缺少 accessToken（typeof=${typeofTop}，含data=${hasDataField}，` +
    `含data.data=${hasNestedDataData}，code类型=${codeType}，` +
    `accessToken类型=${accessTokenType}，accessToken长度=${accessTokenLen}，` +
    `token别名字段类型=${tokenAliasType}）`
  )
}

export function coerceAuthPayload(raw: unknown): {
  accessToken?: string
  user: UserInfo
  profileCompleted: boolean
} {
  const unwrapped = unwrapApiSuccessBody<Record<string, unknown>>(raw)
  if (!unwrapped || typeof unwrapped !== 'object') {
    throw new Error(formatMissingAccessTokenDiagnostic(raw))
  }
  const user = unwrapped.user as UserInfo
  if (!user || typeof user !== 'object') {
    throw new Error(formatMissingAccessTokenDiagnostic(raw))
  }
  return {
    accessToken: pickAccessToken(unwrapped),
    user,
    profileCompleted: unwrapped.profileCompleted !== false,
  }
}
