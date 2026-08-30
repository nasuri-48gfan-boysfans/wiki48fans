export type MemberStatus = 'active' | 'graduated' | 'unknown'

/** A normalized member record produced by a `SourceAdapter` (already parsed + normalized, not yet persisted). */
export interface MemberRecord {
  slug: string
  name: string
  nickname?: string
  generation?: number
  /** Team within the group, e.g. 'KIII', 'J', 'T' for JKT48. */
  team?: string
  birthDate?: string
  birthPlace?: string
  heightCm?: number
  bloodType?: string
  joinedDate?: string
  graduationDate?: string
  status: MemberStatus
  profileImageUrl?: string
  biography?: string
  officialProfileUrl?: string
  /** Stable external identifier used for idempotent upsert within a group. */
  sourceIdentifier: string
  source: string
  sourceUrl?: string
  /** Live-tracking platform identity (fed into members.showroom_room_id). */
  showroomRoomId?: string
  /** Live-tracking platform identity (fed into members.idn_user_id). */
  idnUserId?: string
}
