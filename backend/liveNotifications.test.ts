import { test } from 'node:test'
import assert from 'node:assert/strict'
import { notifyOshiLive, type NotificationKey, type NewLiveEvent, type OshiNotifierDeps } from './liveNotifications.js'

interface FakeState {
  created: Array<Record<string, unknown>>
  claimedKeys: Set<string>
  userIdsByMember: Record<string, string[]>
  names: Record<string, string | undefined>
  userIdCalls: string[]
}

function fakeDeps(overrides: Partial<OshiNotifierDeps> = {}): { deps: OshiNotifierDeps; state: FakeState } {
  const state: FakeState = { created: [], claimedKeys: new Set(), userIdsByMember: {}, names: {}, userIdCalls: [] }
  const deps: OshiNotifierDeps = {
    async listOshiUserIds(memberId) {
      state.userIdCalls.push(memberId)
      return state.userIdsByMember[memberId] ?? []
    },
    async getMemberName(memberId) {
      return state.names[memberId]
    },
    async claimNotificationKey(key: NotificationKey) {
      const k = `${key.userId}|${key.memberId}|${key.platform}|${key.liveId}`
      if (state.claimedKeys.has(k)) return false
      state.claimedKeys.add(k)
      return true
    },
    async createNotification(row) {
      state.created.push(row)
    },
    ...overrides,
  }
  return { deps, state }
}

function liveEvent(overrides: Partial<NewLiveEvent> = {}): NewLiveEvent {
  return { memberId: 'member-1', platform: 'showroom', liveId: 'live-1', title: 'Selamat malam', url: 'https://showroom/live-1', ...overrides }
}

test('oshi live detected creates a notification per matching oshi user', async () => {
  const { deps, state } = fakeDeps()
  state.userIdsByMember['member-1'] = ['user-a', 'user-b']
  state.names['member-1'] = 'Luna Salsabila'
  const result = await notifyOshiLive(liveEvent(), deps)
  assert.equal(result.notified, 2)
  assert.equal(result.errors.length, 0)
  assert.equal(state.created.length, 2)
  assert.equal(state.created[0].user_id, 'user-a')
  assert.equal(state.created[1].user_id, 'user-b')
  assert.equal(state.created[0].category, 'oshi')
  assert.equal(state.created[0].member_id ?? undefined, undefined)
  assert.equal(state.created[0].target_url, 'https://showroom/live-1')
  assert.match(String(state.created[0].title), /Luna Salsabila/)
})

test('user without that oshi gets no notification', async () => {
  const { deps, state } = fakeDeps()
  state.userIdsByMember['member-1'] = ['user-a']
  const result = await notifyOshiLive(liveEvent(), deps)
  assert.equal(result.notified, 1)
  assert.equal(state.created.length, 1)
  const other = await notifyOshiLive(liveEvent({ liveId: 'live-2' }), deps)
  assert.equal(other.notified, 1)
  assert.equal(state.created.length, 2)
  assert.ok(state.created.every((row) => row.user_id === 'user-a'))
})

test('already-notified same live is skipped (no duplicate)', async () => {
  const { deps, state } = fakeDeps()
  state.userIdsByMember['member-1'] = ['user-a']
  const first = await notifyOshiLive(liveEvent(), deps)
  const second = await notifyOshiLive(liveEvent(), deps)
  assert.equal(first.notified, 1)
  assert.equal(second.notified, 0)
  assert.equal(second.skippedExisting, 1)
  assert.equal(state.created.length, 1)
})

test('dedup key is per user + live: same user, different live of same member → new notification', async () => {
  const { deps, state } = fakeDeps()
  state.userIdsByMember['member-1'] = ['user-a']
  await notifyOshiLive(liveEvent({ liveId: 'live-1' }), deps)
  await notifyOshiLive(liveEvent({ liveId: 'live-2' }), deps)
  assert.equal(state.created.length, 2)
  assert.ok(state.created.every((row) => row.user_id === 'user-a'))
})

test('same member with two oshi users fans out to both, each once', async () => {
  const { deps, state } = fakeDeps()
  state.userIdsByMember['member-1'] = ['user-a', 'user-b']
  const result = await notifyOshiLive(liveEvent(), deps)
  assert.equal(result.notified, 2)
  assert.equal(result.skippedExisting, 0)
  assert.deepEqual(new Set(state.created.map((row) => row.user_id)), new Set(['user-a', 'user-b']))
})

test('two members live fans out correctly per user across members', async () => {
  const { deps, state } = fakeDeps()
  state.userIdsByMember['member-1'] = ['user-a', 'user-b']
  state.userIdsByMember['member-2'] = ['user-b']
  await notifyOshiLive(liveEvent({ memberId: 'member-1', liveId: 'live-1' }), deps)
  await notifyOshiLive(liveEvent({ memberId: 'member-2', liveId: 'live-2' }), deps)
  const userA = state.created.filter((row) => row.user_id === 'user-a').map((row) => row.title)
  const userB = state.created.filter((row) => row.user_id === 'user-b')
  assert.equal(userA.length, 1, 'user-a only follows member-1')
  assert.equal(userB.length, 2, 'user-b follows both members')
  assert.equal(state.created.length, 3)
})

test('listOshi failure is captured and produces no notifications', async () => {
  const { state } = fakeDeps()
  const deps: OshiNotifierDeps = {
    async listOshiUserIds() { throw new Error('profiles lookup failed: boom') },
    async claimNotificationKey() { return true },
    async createNotification(row) { state.created.push(row) },
  }
  const result = await notifyOshiLive(liveEvent(), deps)
  assert.equal(result.notified, 0)
  assert.equal(state.created.length, 0)
  assert.ok(result.errors.some((e) => e.includes('boom')))
})

test('createNotification failure for one user does not stop others', async () => {
  const { state } = fakeDeps()
  let call = 0
  const deps: OshiNotifierDeps = {
    async listOshiUserIds() { return ['user-a', 'user-b'] },
    async claimNotificationKey() { return true },
    async createNotification(row) {
      call += 1
      if (call === 1) throw new Error('notification insert failed: insert_metadata')
      state.created.push(row)
    },
  }
  const result = await notifyOshiLive(liveEvent(), deps)
  assert.equal(result.notified, 1)
  assert.equal(state.created.length, 1)
  assert.equal(state.created[0].user_id, 'user-b')
  assert.ok(result.errors.some((e) => e.includes('insert_metadata')))
})

test('missing memberId or liveId short-circuits without touching deps', async () => {
  const { deps, state } = fakeDeps()
  state.userIdsByMember['member-1'] = ['user-a']
  const a = await notifyOshiLive(liveEvent({ memberId: '' }), deps)
  assert.equal(a.notified, 0)
  const b = await notifyOshiLive(liveEvent({ liveId: '' }), deps)
  assert.equal(b.notified, 0)
  assert.equal(state.created.length, 0)
})

test('body falls back to platform/member name when title equals liveId', async () => {
  const { deps, state } = fakeDeps()
  state.userIdsByMember['member-1'] = ['user-a']
  state.names['member-1'] = 'Freya'
  await notifyOshiLive(liveEvent({ title: 'live-1' }), deps)
  assert.equal(state.created[0].title, '⭐ Oshi kamu sedang live! Freya')
  assert.match(String(state.created[0].body), /Freya/)
  assert.match(String(state.created[0].body), /showroom/)
})
