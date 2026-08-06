export type AppAccessPolicy = 'allow_all' | 'deny_all_explicit'

export type WhitelistEntry = {
  id: string
  app_id: string
  user_id: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

export const isAppAccessPolicy = (value: unknown): value is AppAccessPolicy =>
  value === 'allow_all' || value === 'deny_all_explicit'
