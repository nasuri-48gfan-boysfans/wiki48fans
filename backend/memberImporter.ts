import { supabaseAdmin } from './supabaseAdmin.js'
import { RateLimiter } from './rateLimiter.js'
import type { MemberRecord } from './memberTypes.js'

/**
 * A member data source. Two-phase design so cheap list data is fetched first and
 * expensive per-member detail is fetched lazily, through the pipeline's rate
 * limiter and database cache (SYNC mode).
 */
export interface SourceAdapter {
  /** Unique group slug this adapter imports for, e.g. `jkt48`. */
  readonly groupSlug: string
  /**
   * Fetch the cheap base list of members. Every normalized record must carry a
   * stable `sourceIdentifier` and `source`. Must not touch the database.
   * @throws on a hard, unrecoverable source failure.
   */
  fetchList(): Promise<MemberRecord[]>
  /**
   * Enrich one member with fields only available via a detail endpoint (e.g.
   * birth date, height). Called by the pipeline through the rate limiter, and
   * only when the member's cached data is missing or stale (SYNC). When omitted,
   * the adapter is single-phase and list records are written as-is.
   */
  fetchDetail?(base: MemberRecord): Promise<MemberRecord>
}

/** Narrow data-access surface the importer needs. Injectable for tests. */
export interface MemberStore {
  resolveGroup(groupSlug: string): Promise<{ id: string }>
  /** Returns the row id and its last_verified_at (null when absent). */
  findByIdentity(groupId: string, sourceIdentifier: string): Promise<{ id: string; lastVerifiedAt: string | null } | null>
  insert(payload: unknown): Promise<string | null>
  update(id: string, changes: Record<string, unknown>): Promise<string | null>
  read(id: string): Promise<Record<string, unknown> | null>
}

export type ImportMode = 'initial' | 'sync'

export interface ImportOptions {
  dryRun?: boolean
  /** initial fetches every detail; sync skips detail for fresh members. */
  mode?: ImportMode
  /** Freshness window used by sync mode to skip detail re-fetch. */
  maxDetailAgeMs?: number
  /** Safety-capped request rate (requests/minute) for the detail phase. */
  rateLimitPerMin?: number
  store?: MemberStore
  /** Progress callback: (done, total, code, message). */
  onProgress?: (progress: { done: number; total: number; code: string; message?: string }) => void
  onRateLimitWait?: (seconds: number) => void
}

export interface ImportReport {
  groupId: string
  groupSlug: string
  source: string | null
  fetched: number
  listCount: number
  detailFetched: number
  detailSkippedCached: number
  valid: number
  skipped: number
  created: number
  updated: number
  unchanged: number
  errors: string[]
}

export function validate(record: MemberRecord): string[] {
  const problems: string[] = []
  if (!record.slug || /[^a-z0-9-]/.test(record.slug)) problems.push(`slug "${record.slug}" must be lowercase alphanumeric/hyphens`)
  if (!record.name || !record.name.trim()) problems.push('name is required')
  if (!record.sourceIdentifier) problems.push('sourceIdentifier is required for idempotent import')
  if (record.generation !== undefined && (record.generation < 1 || !Number.isInteger(record.generation))) problems.push(`generation ${record.generation} is not a positive integer`)
  if (record.heightCm !== undefined && (record.heightCm < 80 || record.heightCm > 300)) problems.push(`heightCm ${record.heightCm} is out of plausible range`)
  if (record.status && !['active', 'graduated', 'unknown'].includes(record.status)) problems.push(`status "${record.status}" is invalid`)
  for (const field of ['birthDate', 'joinedDate', 'graduationDate'] as const) {
    if (record[field] !== undefined && Number.isNaN(Date.parse(record[field] as string))) problems.push(`${field} "${record[field]}" is not a valid date`)
  }
  return problems
}

function comparable(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/** Build the Supabase row payload for a valid record. */
export function toMemberPayload(groupId: string, record: MemberRecord): Record<string, unknown> {
  return {
    group_id: groupId,
    name: record.name,
    slug: record.slug,
    nickname: record.nickname ?? null,
    generation: record.generation ?? null,
    birth_date: record.birthDate ?? null,
    birth_place: record.birthPlace ?? null,
    height_cm: record.heightCm ?? null,
    blood_type: record.bloodType ?? null,
    joined_date: record.joinedDate ?? null,
    graduation_date: record.graduationDate ?? null,
    status: record.status ?? 'unknown',
    photo_url: record.profileImageUrl ?? null,
    is_active: (record.status ?? 'unknown') !== 'graduated',
    bio: record.biography ?? '',
    official_profile_url: record.officialProfileUrl ?? null,
    source: record.source,
    source_url: record.sourceUrl ?? null,
    source_identifier: record.sourceIdentifier,
    showroom_room_id: record.showroomRoomId ?? null,
    idn_user_id: record.idnUserId ?? null,
    last_verified_at: new Date().toISOString(),
  }
}

function buildStore(): MemberStore {
  return {
    async resolveGroup(groupSlug) {
      const { data, error } = await supabaseAdmin.from('groups').select('id').or(`slug.eq.${groupSlug},name.eq.${groupSlug}`).maybeSingle()
      if (error) throw new Error(`Failed to resolve group "${groupSlug}": ${error.message}`)
      if (!data) throw new Error(`Group "${groupSlug}" not found. Seed groups before importing.`)
      return { id: data.id }
    },
    async findByIdentity(groupId, sourceIdentifier) {
      const { data, error } = await supabaseAdmin.from('members').select('id, last_verified_at').eq('group_id', groupId).eq('source_identifier', sourceIdentifier).maybeSingle()
      if (error) throw new Error(`Failed to query member identity: ${error.message}`)
      return data ? { id: data.id, lastVerifiedAt: (data.last_verified_at as string | null) ?? null } : null
    },
    async insert(payload: Record<string, unknown>) {
      const { error } = await supabaseAdmin.from('members').insert(payload)
      if (error) return String(error.code) === '23505' ? 'unchanged' : error.message
      return null
    },
    async read(id) {
      const { data, error } = await supabaseAdmin.from('members').select('*').eq('id', id).maybeSingle()
      if (error || !data) return null
      return data as Record<string, unknown>
    },
    async update(id, changes) {
      const { error } = await supabaseAdmin.from('members').update(changes).eq('id', id)
      return error ? error.message : null
    },
  }
}

function isFresh(lastVerifiedAt: string | null, maxAgeMs: number): boolean {
  if (!lastVerifiedAt) return false
  const parsed = Date.parse(lastVerifiedAt)
  if (Number.isNaN(parsed)) return false
  return Date.now() - parsed < maxAgeMs
}

async function upsertRecord(
  store: MemberStore,
  groupId: string,
  record: MemberRecord,
  dryRun: boolean,
  report: ImportReport,
): Promise<void> {
  if (dryRun) return
  const existing = await store.findByIdentity(groupId, record.sourceIdentifier)
  if (!existing) {
    const error = await store.insert(toMemberPayload(groupId, record))
    if (error === null) report.created += 1
    else if (error === 'unchanged') report.unchanged += 1
    else report.errors.push(`insert ${record.name}: ${error}`)
    return
  }

  const current = await store.read(existing.id)
  if (!current) { report.errors.push(`read ${record.name}: not found`); return }

  const target = toMemberPayload(groupId, record)
  const changed: Record<string, unknown> = {}
  for (const key of Object.keys(target)) {
    // last_verified_at is refresh metadata, not content; it alone is not an update.
    if (key === 'last_verified_at') continue
    if (comparable(current[key]) !== comparable(target[key])) changed[key] = target[key]
  }
  if (Object.keys(changed).length === 0) { report.unchanged += 1; return }
  changed.last_verified_at = new Date().toISOString()

  const error = await store.update(existing.id, changed)
  if (error) report.errors.push(`update ${record.name}: ${error}`)
  else report.updated += 1
}

/**
 * Import members for a single adapter. Two-phase, cache-aware and idempotent:
 *   - list records are fetched once;
 *   - detail is fetched per-member only when the adapter declares fetchDetail
 *     and the member's cache is missing/stale (SYNC) or always (INITIAL);
 *   - requests are throttled by a RateLimiter (safety margin below quota);
 *   - rows are matched on the stable unique key (group_id, source_identifier).
 */
export async function importMembers(
  adapter: SourceAdapter,
  options: ImportOptions = {},
): Promise<ImportReport> {
  const dryRun = Boolean(options.dryRun)
  const mode: ImportMode = options.mode ?? 'initial'
  const maxAgeMs = options.maxDetailAgeMs ?? 24 * 60 * 60 * 1000
  const store = options.store ?? buildStore()
  const hasDetail = typeof adapter.fetchDetail === 'function'

  const report: ImportReport = {
    groupId: '',
    groupSlug: adapter.groupSlug,
    source: null,
    fetched: 0,
    listCount: 0,
    detailFetched: 0,
    detailSkippedCached: 0,
    valid: 0,
    skipped: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: [],
  }

  let base: MemberRecord[] = []
  try {
    base = await adapter.fetchList()
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error))
    return report
  }

  report.fetched = base.length
  report.listCount = base.length
  report.source = base[0]?.source ?? null
  if (base.length === 0) return report

  const group = await store.resolveGroup(adapter.groupSlug)
  report.groupId = group.id

  const limiter = hasDetail ? new RateLimiter({
    maxPerMinute: options.rateLimitPerMin ?? 45,
    onWait: options.onRateLimitWait,
  }) : null

  const total = base.length
  let done = 0

  for (const baseRecord of base) {
    done += 1
    let record = baseRecord
    let detailSkipped = false

    if (hasDetail && limiter) {
      let needDetail = mode === 'initial'
      if (mode === 'sync') {
        const existing = await store.findByIdentity(group.id, baseRecord.sourceIdentifier)
        if (existing && isFresh(existing.lastVerifiedAt, maxAgeMs)) {
          needDetail = false
          detailSkipped = true
          report.detailSkippedCached += 1
        } else {
          needDetail = true
        }
      }
      if (needDetail) {
        await limiter.acquire()
        try {
          report.detailFetched += 1
          options.onProgress?.({ done, total, code: baseRecord.sourceIdentifier, message: 'fetching detail' })
          record = await adapter.fetchDetail!(baseRecord)
        } catch (error) {
          // Keep list-level data but report the detail failure so a later sync retries.
          const message = error instanceof Error ? error.message : String(error)
          report.detailFetched -= 1
          report.errors.push(`detail ${baseRecord.name || baseRecord.sourceIdentifier}: ${message}`)
          // A 429 should pause the queue (honor Retry-After).
          if (/429|rate.?limit/i.test(message)) {
            const retryMatch = message.match(/retry after (\d+)\s*s/i)
            const recoveryMs = retryMatch ? Number(retryMatch[1]) * 1000 : undefined
            limiter.observeRateLimit(recoveryMs)
            options.onProgress?.({ done, total, code: baseRecord.sourceIdentifier, message: 'rate limited, backing off' })
          } else {
            options.onProgress?.({ done, total, code: baseRecord.sourceIdentifier, message: 'detail failed, keeping list data' })
          }
        }
      }
    }

    if (detailSkipped) {
      // Cache is fresh: nothing to write in sync mode.
      report.unchanged += 1
      options.onProgress?.({ done, total, code: baseRecord.sourceIdentifier, message: 'cache fresh, skipped detail' })
      continue
    }

    const problems = validate(record)
    if (problems.length) {
      report.skipped += 1
      report.errors.push(`${record.name || record.slug}: ${problems.join('; ')}`)
      options.onProgress?.({ done, total, code: baseRecord.sourceIdentifier, message: `invalid: ${problems[0]}` })
      continue
    }
    report.valid += 1
    report.source = report.source ?? record.source

    await upsertRecord(store, group.id, record, dryRun, report)
    options.onProgress?.({ done, total, code: baseRecord.sourceIdentifier, message: dryRun ? 'would import' : 'imported' })
  }

  return report
}
