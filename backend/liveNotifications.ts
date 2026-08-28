import type { LivePlatform } from './liveTracker.js'
import { supabaseAdmin } from './supabaseAdmin.js'
import { liveDatabase } from './mongodb.js'

export interface NewLiveEvent {
  memberId: string
  platform: LivePlatform
  liveId: string
  title?: string
  url?: string
}

export interface NotificationKey {
  userId: string
  memberId: string
  platform: string
  liveId: string
}

export interface OshiNotifierDeps {
  listOshiUserIds(memberId: string): Promise<string[]>
  getMemberName?(memberId: string): Promise<string | undefined>
  claimNotificationKey(key: NotificationKey): Promise<boolean>
  createNotification(row: Record<string, unknown>): Promise<void>
}

export interface OshiNotifyResult {
  notified: number
  skippedExisting: number
  errors: string[]
}

export async function notifyOshiLive(event: NewLiveEvent, deps: OshiNotifierDeps): Promise<OshiNotifyResult> {
  const result: OshiNotifyResult = { notified: 0, skippedExisting: 0, errors: [] }
  if (!event.memberId || !event.liveId) return result

  let userIds: string[]
  try {
    userIds = await deps.listOshiUserIds(event.memberId)
  } catch (error) {
    result.errors.push(`listOshiUserIds: ${error instanceof Error ? error.message : String(error)}`)
    return result
  }

  if (userIds.length === 0) return result

  let memberName: string | undefined
  if (deps.getMemberName) {
    try {
      memberName = await deps.getMemberName(event.memberId)
    } catch (error) {
      result.errors.push(`getMemberName: ${error instanceof Error ? error.message : String(error)}`)
      memberName = undefined
    }
  }

  const title = `⭐ Oshi kamu sedang live!${memberName ? ` ${memberName}` : ''}`
  const body = event.title && event.title !== event.liveId ? event.title : `${memberName ?? 'Oshimu'} lagi live di ${event.platform}`
  const targetUrl = event.url || '/live'

  for (const userId of userIds) {
    const key: NotificationKey = { userId, memberId: event.memberId, platform: event.platform, liveId: event.liveId }
    let claimed: boolean
    try {
      claimed = await deps.claimNotificationKey(key)
    } catch (error) {
      result.errors.push(`claim(notified key) ${userId}: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!claimed) {
      result.skippedExisting += 1
      continue
    }
    try {
      await deps.createNotification({
        user_id: userId,
        category: 'oshi',
        priority: 2,
        title,
        body,
        target_url: targetUrl,
      })
      result.notified += 1
    } catch (error) {
      result.errors.push(`createNotification(user) ${userId}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return result
}

export async function createMongoNotificationKey(deps?: {
  collectionName?: string
}): Promise<OshiNotifierDeps['claimNotificationKey']> {
  const collection = liveDatabase.collection<NotificationKey & { claimedAt: Date }>(deps?.collectionName || 'notified_keys')
  try {
    await collection.createIndex(
      { userId: 1, memberId: 1, platform: 1, liveId: 1 },
      { unique: true, name: 'uniq_notified_key' },
    )
  } catch {
    // Index may already exist; ignore.
  }
  return async (key: NotificationKey) => {
    const { acknowledged, upsertedCount } = await collection.updateOne(
      { ...key },
      { $setOnInsert: { ...key, claimedAt: new Date() } },
      { upsert: true },
    )
    return acknowledged && upsertedCount === 1
  }
}

export async function createOshiNotifierDeps(deps?: { collectionName?: string }): Promise<OshiNotifierDeps> {
  const claimNotificationKey = await createMongoNotificationKey(deps)
  return {
    async listOshiUserIds(memberId: string) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .contains('oshi_ids', [memberId])
      if (error) throw new Error(`profiles lookup failed: ${error.message}`)
      return (data || []).map((row) => row.id as string)
    },
    async getMemberName(memberId: string) {
      const { data, error } = await supabaseAdmin
        .from('members')
        .select('name')
        .eq('id', memberId)
        .maybeSingle()
      if (error || !data) return undefined
      return (data as { name?: string }).name
    },
    claimNotificationKey,
    async createNotification(row) {
      const { error } = await supabaseAdmin.from('notifications').insert(row)
      if (error) throw new Error(`notification insert failed: ${error.message}`)
    },
  }
}
