import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeJkt48, jkt48Slug } from './memberAdapters/jkt48.js'
import { normalizeJkt48Connect } from './memberAdapters/jkt48connect.js'
import { normalize48pedia, normalize48pediaList } from './memberAdapters/48pedia.js'
import { importMembers, validate, toMemberPayload, type MemberStore, type SourceAdapter } from './memberImporter.js'
import { RateLimiter } from './rateLimiter.js'
import type { MemberRecord } from './memberTypes.js'

function fakeStore(initial: MemberRecord[] = []): { store: MemberStore; rows: Array<Record<string, unknown>> } {
  const rows: Array<Record<string, unknown>> = initial.map((record, index) => ({ id: `id-${index}`, ...toMemberPayload('group-1', record) }))
  return {
    rows,
    store: {
      async resolveGroup() { return { id: 'group-1' } },
      async findByIdentity(_groupId, sourceIdentifier) {
        const found = rows.find((row) => row.source_identifier === sourceIdentifier)
        return found ? { id: found.id as string, lastVerifiedAt: (found.last_verified_at as string | null) ?? null } : null
      },
      async insert(payload) {
        rows.push({ id: `id-${rows.length}`, ...payload as Record<string, unknown> })
        return null
      },
      async read(id) {
        const found = rows.find((row) => row.id === id)
        return found ? { ...found } : null
      },
      async update(id, changes) {
        const row = rows.find((entry) => entry.id === id)
        if (row) Object.assign(row, changes)
        return null
      },
    },
  }
}

function record(overrides: Partial<MemberRecord> = {}): MemberRecord {
  return {
    slug: 'luna-salsabila',
    name: 'Luna Salsabila',
    status: 'active',
    source: 'jkt48.com',
    sourceIdentifier: '267',
    ...overrides,
  }
}

/** Single-phase adapter (no detail phase). */
function singleAdapter(records: MemberRecord[]): SourceAdapter {
  return { groupSlug: 'jkt48', async fetchList() { return records } }
}

/** Two-phase adapter with a controllable detail mapper and error injection. */
function detailAdapter(
  list: MemberRecord[],
  enrich: (base: MemberRecord) => MemberRecord,
  failCodes: string[] = [],
): SourceAdapter {
  return {
    groupSlug: 'jkt48',
    async fetchList() { return list },
    async fetchDetail(base) {
      if (failCodes.includes(base.sourceIdentifier)) throw new Error(`boom on ${base.sourceIdentifier}`)
      return enrich(base)
    },
  }
}

test('jkt48Slug produces lowercase hyphenated slugs', () => {
  assert.equal(jkt48Slug('Luna Salsabila'), 'luna-salsabila')
  assert.equal(jkt48Slug('Aoi Tanaka 田中'), 'aoi-tanaka')
  assert.equal(jkt48Slug('  Freya  '), 'freya')
})

test('normalizeJkt48 maps official fields and keeps provenance', () => {
  const raw = {
    id: 267,
    full_name: 'Luna Salsabila',
    nickname: 'Luna',
    generation_name: 'Gen 8 (2021)',
    birthday: '2004-05-12',
    height: 158,
    blood_type: 'O',
    birth_place: 'Jakarta',
    join_date: '2021-05-01',
    status: 'active',
    profile_image: 'https://img/jkt48/luna.jpg',
    url_key: 'luna',
  }
  const member = normalizeJkt48(raw, 'jkt48.com')
  assert.equal(member.sourceIdentifier, '267')
  assert.equal(member.generation, 8)
  assert.equal(member.birthDate, '2004-05-12')
  assert.equal(member.heightCm, 158)
  assert.equal(member.status, 'active')
  assert.equal(member.source, 'jkt48.com')
  assert.equal(member.officialProfileUrl, 'https://jkt48.com/member/detail/id/267')
})

test('normalizeJkt48 treats graduate status and missing optionals', () => {
  const member = normalizeJkt48({ id: 5, full_name: 'Old Member', status: 'Graduated 2023' }, 'jkt48.com')
  assert.equal(member.status, 'graduated')
  assert.equal(member.generation, undefined)
  assert.equal(member.heightCm, undefined)
})

test('validate rejects bad slugs, missing identity, implausible height', () => {
  assert.deepEqual(validate(record()), [])
  assert.ok(validate(record({ slug: 'Luna Salsabila' })).some((p) => p.includes('slug')))
  assert.ok(validate(record({ sourceIdentifier: '' })).some((p) => p.includes('sourceIdentifier')))
  assert.ok(validate(record({ heightCm: 500 })).some((p) => p.includes('heightCm')))
  assert.ok(validate(record({ birthDate: 'not-a-date' })).some((p) => p.includes('birthDate')))
})

test('importMembers inserts new members', async () => {
  const { store, rows } = fakeStore()
  const report = await importMembers(singleAdapter([record()]), { store })
  assert.equal(report.created, 1)
  assert.equal(report.fetched, 1)
  assert.equal(report.valid, 1)
  assert.equal(rows.length, 1)
  assert.equal(report.errors.length, 0)
})

test('importMembers is idempotent: running twice does not duplicate', async () => {
  const existing = [record()]
  const { store, rows } = fakeStore(existing)
  const second = await importMembers(singleAdapter([record()]), { store })
  assert.equal(second.created, 0)
  assert.equal(second.unchanged, 1)
  assert.equal(rows.length, 1)
})

test('importMembers updates changed fields without duplicating', async () => {
  const existing = [record({ nickname: 'Old' })]
  const { store, rows } = fakeStore(existing)
  const report = await importMembers(singleAdapter([record({ nickname: 'New' })]), { store })
  assert.equal(report.updated, 1)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].nickname, 'New')
})

test('importMembers dry run writes nothing', async () => {
  const { store, rows } = fakeStore()
  const report = await importMembers(singleAdapter([record()]), { store, dryRun: true })
  assert.equal(report.valid, 1)
  assert.equal(rows.length, 0)
})

test('importMembers skips invalid records and reports problems', async () => {
  const bad = record({ slug: 'Bad Slug', heightCm: 999 })
  const good = record()
  const { store, rows } = fakeStore()
  const report = await importMembers(singleAdapter([bad, good]), { store })
  assert.equal(report.skipped, 1)
  assert.equal(report.created, 1)
  assert.equal(report.errors.length, 1)
  assert.equal(rows.length, 1)
})

test('importMembers reports a source fetch failure and keeps other fields zero', async () => {
  const failing: SourceAdapter = { groupSlug: 'jkt48', async fetchList() { throw new Error('blocked by anti-bot') } }
  const { store, rows } = fakeStore()
  const report = await importMembers(failing, { store })
  assert.equal(report.fetched, 0)
  assert.ok(report.errors.some((e) => e.includes('anti-bot')))
  assert.equal(rows.length, 0)
})

test('normalizeJkt48Connect maps community member incl. live-tracking ids', () => {
  const member = normalizeJkt48Connect({
    _id: 'FREYA_JAYAWARDANA',
    name: 'Freya Jayawardana',
    nicknames: ['Freya'],
    generation: 'gen8-jkt48',
    room_id: 1234,
    sr_exists: true,
    is_graduate: false,
    team: 'KIII',
    socials: [
      { title: 'SHOWROOM', url: 'https://www.showroom-live.com/JKT48_Freya' },
      { title: 'IDN', url: 'https://click.idn.media/VKUf?af_dp=idnapp://profile/f001ba66-3c51-4849-9afa-13cf74eb1571' },
    ],
    img: 'https://img/freya.jpg',
  })
  assert.equal(member.sourceIdentifier, 'FREYA_JAYAWARDANA')
  assert.equal(member.generation, 8)
  assert.equal(member.status, 'active')
  // JKT48Connect's room_id is an internal id, NOT an official SHOWROOM id, so
  // it must not be emitted as showroomRoomId (official ids come from applyShowroomRooms.ts).
  assert.equal(member.showroomRoomId, undefined)
  assert.equal(member.idnUserId, 'f001ba66-3c51-4849-9afa-13cf74eb1571')
  assert.equal(member.source, 'jkt48connect')
})

test('normalizeJkt48Connect marks graduated and leaves no provider ids when absent', () => {
  const member = normalizeJkt48Connect({ _id: 'OLD_MEMBER', name: 'Old Member', room_id: 999, is_graduate: true, socials: [] })
  assert.equal(member.status, 'graduated')
  assert.equal(member.showroomRoomId, undefined)
  assert.equal(member.idnUserId, undefined)
})

test('normalizeJkt48Connect drops bad generations and omits idn without a profile', () => {
  const member = normalizeJkt48Connect({ _id: 'MIKAELA_KUSJANTO', name: 'Mikaela Kusjanto', room_id: 782345, generation: 'unknown-gen', socials: [{ title: 'SHOWROOM', url: 'https://www.showroom-live.com/JKT48_Mikaela' }] })
  // Connect room_id is internal and must not leak into the official SHOWROOM id.
  assert.equal(member.showroomRoomId, undefined)
  assert.equal(member.generation, undefined)
  assert.equal(member.idnUserId, undefined)
})

test('normalizeJkt48Connect treats room_id 0 as no showroom id', () => {
  const member = normalizeJkt48Connect({ _id: 'FAHIRA_PUTRI', name: 'Fahira Putri', room_id: 0, socials: [] })
  assert.equal(member.showroomRoomId, undefined)
})

test('importer persists live-tracking platform ids from the source', async () => {
  const { store, rows } = fakeStore()
  const member = record({ showroomRoomId: '1234', idnUserId: 'idn-x' })
  const report = await importMembers(singleAdapter([member]), { store })
  assert.equal(report.created, 1)
  assert.equal(rows[0].showroom_room_id, '1234')
  assert.equal(rows[0].idn_user_id, 'idn-x')
})

test('enrichOnly updates provider ids on existing members without clobbering catalog fields', async () => {
  // Seed a rich existing member (like a 48pedia row) with no provider ids yet.
  const existing = [record({ sourceIdentifier: 'FREYA_JAYAWARDANA', name: 'Freyanashifa Jayawardana', heightCm: 165, bloodType: 'A' })]
  const { store, rows } = fakeStore(existing)
  const adapter: SourceAdapter = {
    groupSlug: 'jkt48',
    enrichOnly: true,
    async fetchList() {
      return [
        record({ sourceIdentifier: 'FREYA_JAYAWARDANA', name: 'Freya', showroomRoomId: '791261', idnUserId: 'idn-uuid-1' }),
        record({ sourceIdentifier: 'NEW_MEMBER', name: 'New Member', showroomRoomId: '123', idnUserId: 'idn-uuid-2' }),
      ]
    },
  }
  const report = await importMembers(adapter, { store })
  assert.equal(report.errors.length, 0)
  assert.equal(report.updated, 1) // matched existing member enriched
  assert.equal(report.created, 1) // genuinely-new member inserted wholesale
  const enriched = rows.find((row) => row.source_identifier === 'FREYA_JAYAWARDANA')!
  assert.equal(enriched.showroom_room_id, '791261')
  assert.equal(enriched.idn_user_id, 'idn-uuid-1')
  // Richer catalog fields are preserved, not overwritten with NULLs.
  assert.equal(enriched.name, 'Freyanashifa Jayawardana')
  assert.equal(enriched.height_cm, 165)
  assert.equal(enriched.blood_type, 'A')
  const inserted = rows.find((row) => row.source_identifier === 'NEW_MEMBER')!
  assert.equal(inserted.showroom_room_id, '123')
  assert.equal(inserted.idn_user_id, 'idn-uuid-2')
  assert.equal(inserted.name, 'New Member')
})

test('enrichOnly never NULLs out an existing showroom id when the source omits it', async () => {
  // Existing member already carries an authoritative official showroom id
  // (as applied by applyShowroomRooms.ts).
  const existing = [record({ sourceIdentifier: 'FREYA_JAYAWARDANA', name: 'Freya', showroomRoomId: '318225' })]
  const { store, rows } = fakeStore(existing)
  const adapter: SourceAdapter = {
    groupSlug: 'jkt48',
    enrichOnly: true,
    async fetchList() {
      // Thinner source (e.g. JKT48Connect) provides idn only, no showroom id.
      return [record({ sourceIdentifier: 'FREYA_JAYAWARDANA', name: 'Freya', idnUserId: 'idn-uuid-1' })]
    },
  }
  const report = await importMembers(adapter, { store })
  assert.equal(report.errors.length, 0)
  const enriched = rows.find((row) => row.source_identifier === 'FREYA_JAYAWARDANA')!
  // showroom id must be preserved, not overwritten with NULL.
  assert.equal(enriched.showroom_room_id, '318225')
  assert.equal(enriched.idn_user_id, 'idn-uuid-1')
})

test('normalize48pedia maps the MemberDetail schema and keeps provenance', () => {
  const member = normalize48pedia({
    code: 'FIONY_ALVERIA',
    name: 'Fiony Alveria',
    nickname: 'Fiony',
    generation_code: 'GEN_8',
    birth_date: '2006-01-01',
    birth_place: 'Jakarta',
    height_cm: 158,
    blood_type: 'O',
    joined_date: '2021-05-01',
    graduated_date: null,
    photo: 'https://api.48pedia.id/v1/media/abc',
  })
  assert.equal(member.sourceIdentifier, 'FIONY_ALVERIA')
  assert.equal(member.slug, 'fiony-alveria')
  assert.equal(member.generation, 8)
  assert.equal(member.birthDate, '2006-01-01')
  assert.equal(member.birthPlace, 'Jakarta')
  assert.equal(member.heightCm, 158)
  assert.equal(member.bloodType, 'O')
  assert.equal(member.joinedDate, '2021-05-01')
  assert.equal(member.status, 'active')
  assert.equal(member.profileImageUrl, 'https://api.48pedia.id/v1/media/abc')
  assert.equal(member.source, '48pedia')
  assert.equal(member.sourceUrl, 'https://api.48pedia.id/v1/members/FIONY_ALVERIA')
  assert.equal(member.officialProfileUrl, undefined)
})

test('normalize48pedia marks graduated and leaves missing fields undefined (NULL)', () => {
  const member = normalize48pedia({ code: 'OLD_1', name: 'Old Member', graduated_date: '2023-03-30' })
  assert.equal(member.status, 'graduated')
  assert.equal(member.generation, undefined)
  assert.equal(member.birthDate, undefined)
  assert.equal(member.bloodType, undefined)
  assert.equal(member.heightCm, undefined)
  assert.equal(member.nickname, undefined)
})

test('normalize48pediaList builds base records from the cheap list and points at the list URL', () => {
  const member = normalize48pediaList({ code: 'FIONY_ALVERIA', name: 'Fiony Alveria', nickname: 'Fiony', generation_code: 'GEN_8', photo: null }, 1)
  assert.equal(member.sourceIdentifier, 'FIONY_ALVERIA')
  assert.equal(member.generation, 8)
  assert.equal(member.nickname, 'Fiony')
  assert.equal(member.source, '48pedia')
  assert.equal(member.sourceUrl, 'https://api.48pedia.id/v1/members?page=1&per_page=100')
  assert.equal(member.birthDate, undefined)
  assert.equal(member.status, 'active')
})

test('importMembers (two-phase) fetches detail in initial mode and persists enriched fields', async () => {
  const { store, rows } = fakeStore()
  const list = [record({ sourceIdentifier: 'FIONY_ALVERIA' })]
  const adapterD = detailAdapter(list, (base) => ({ ...base, birthDate: '2006-01-01', heightCm: 158, sourceUrl: 'https://api.48pedia.id/v1/members/FIONY_ALVERIA' }))
  const report = await importMembers(adapterD, { store, mode: 'initial' })
  assert.equal(report.listCount, 1)
  assert.equal(report.detailFetched, 1)
  assert.equal(report.created, 1)
  assert.equal(rows[0].birth_date, '2006-01-01')
  assert.equal(rows[0].height_cm, 158)
  assert.equal(rows[0].source_url, 'https://api.48pedia.id/v1/members/FIONY_ALVERIA')
})

test('importMembers (sync mode) skips detail for a fresh cached member', async () => {
  const fresh = record({ sourceIdentifier: 'FIONY_ALVERIA' })
  const { store } = fakeStore([fresh])
  let detailCalls = 0
  const adapterD = detailAdapter([fresh], (base) => { detailCalls += 1; return { ...base, heightCm: 158 } })
  const report = await importMembers(adapterD, { store, mode: 'sync', maxDetailAgeMs: 3600_000 })
  assert.equal(report.detailFetched, 0)
  assert.equal(report.detailSkippedCached, 1)
  assert.equal(report.unchanged, 1)
  assert.equal(detailCalls, 0)
})

test('importMembers (sync mode) re-fetches detail when cache is stale', async () => {
  const { store, rows: staleRows } = fakeStore([record({ sourceIdentifier: 'FIONY_ALVERIA' })])
  staleRows[0].last_verified_at = new Date(Date.now() - 48 * 3600_000).toISOString()
  const adapterD = detailAdapter([record({ sourceIdentifier: 'FIONY_ALVERIA' })], (base) => ({ ...base, heightCm: 158 }))
  const report = await importMembers(adapterD, { store, mode: 'sync', maxDetailAgeMs: 3600_000 })
  assert.equal(report.detailFetched, 1)
  assert.equal(report.detailSkippedCached, 0)
  assert.equal(report.updated, 1, 'stale row updated with fresh detail')
  assert.equal(staleRows[0].height_cm, 158)
})

test('importMembers reports a detail fetch failure but still writes list-level data', async () => {
  const { store, rows } = fakeStore()
  const adapterD = detailAdapter([record({ sourceIdentifier: 'X' })], (b) => b, ['X'])
  const report = await importMembers(adapterD, { store, mode: 'initial' })
  assert.equal(report.created, 1)
  assert.ok(report.errors.some((e) => e.includes('boom on X')))
  assert.equal(rows.length, 1)
  assert.equal(rows[0].source_identifier, 'X')
})

test('RateLimiter honors a 429 by backing off before the next acquire', async () => {
  // interval for 3000/min = 20ms; backoff of 60ms must delay the next acquire.
  const limiter = new RateLimiter({ maxPerMinute: 3000, defaultBackoffMs: 60 })
  await limiter.observeRateLimit(60)
  const waited = Date.now()
  await limiter.acquire()
  const elapsed = Date.now() - waited
  assert.ok(elapsed >= 50, `acquire after 429 should wait out the backoff (got ${elapsed}ms)`)
})

test('RateLimiter paces serial acquires evenly below quota', async () => {
  const limiter = new RateLimiter({ maxPerMinute: 3000 }) // interval 20ms
  const started = Date.now()
  await limiter.acquire()
  await limiter.acquire()
  await limiter.acquire()
  const elapsed = Date.now() - started
  assert.ok(elapsed >= 40, `three paced acquires should span ~2 intervals (got ${elapsed}ms)`)
  assert.ok(elapsed < 500, 'paced acquires finish quickly for a high rate')
})

test('report exposes detail counters for two-phase runs', async () => {
  const { store } = fakeStore()
  const list = [record({ sourceIdentifier: 'A' }), record({ sourceIdentifier: 'B' })]
  const adapterD = detailAdapter(list, (base) => base)
  const report = await importMembers(adapterD, { store, mode: 'initial', dryRun: true })
  assert.equal(report.fetched, 2)
  assert.equal(report.listCount, 2)
  assert.equal(report.detailFetched, 2)
  assert.equal(report.valid, 2)
  assert.equal(report.created, 0, 'dry run writes nothing')
})
