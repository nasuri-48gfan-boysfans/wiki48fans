export interface FrontendGroup {
  id: string
  name: string
  slug?: string
  country?: string
  description?: string
  logoUrl?: string
  officialUrl?: string
  primaryColor: string
  secondaryColor: string
  glowColor: string
}

export type MemberStatus = 'active' | 'graduated' | 'unknown'

export interface FrontendMember {
  id: string
  name: string
  nickname?: string
  slug: string
  photoUrl?: string
  bio?: string
  generation?: number
  /** Team within the group, e.g. 'KIII', 'J', 'T' for JKT48. */
  team?: string
  status: MemberStatus
  isActive: boolean
  birthDate?: string
  birthPlace?: string
  heightCm?: number
  bloodType?: string
  joinedDate?: string
  graduationDate?: string
  officialProfileUrl?: string
  source?: string
  groupId: string
  groupName: string
  primaryColor: string
  secondaryColor: string
  glowColor: string
}

export type LivePlatform = 'SHOWROOM' | 'IDN'

export interface LiveSession {
  memberId?: string
  memberName: string
  memberSlug?: string
  groupName?: string
  platform: LivePlatform
  liveTitle?: string
  viewerCount?: number
  liveUrl?: string
  startedAt?: string
}
