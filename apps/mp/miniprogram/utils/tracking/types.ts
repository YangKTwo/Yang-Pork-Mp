export type TrackProps = Record<string, string | number | boolean | null | undefined>

export interface TrackCommonProps {
  user_id: string | null
  session_id: string
  page: string
  timestamp: string
  platform: 'mp'
  app_version?: string
  role?: string | null
  pay_mode?: string
}
