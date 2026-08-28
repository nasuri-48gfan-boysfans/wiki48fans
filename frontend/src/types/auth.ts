export type UserRole = 'user' | 'contributor' | 'moderator' | 'admin' | 'super_admin'

export interface Profile {
  id: string
  displayName: string
  handle: string
  email: string
  role: UserRole
  avatarUrl?: string
  oshiIds: string[]
}

export interface AuthSession {
  profile: Profile
  accessToken: string
}
