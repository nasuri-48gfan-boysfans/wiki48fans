import { IdnAdapter, ShowroomAdapter } from './liveAdapters.js'

const showroom = new ShowroomAdapter(15000)
const showroomSessions = await showroom.getLiveSessions()
console.log(JSON.stringify({ platform: 'showroom', count: showroomSessions.length, sample: showroomSessions[0] || null }))

const idn = new IdnAdapter(10000)

console.log('--- IDN empty mappings (expect 0, no throw) ---')
try {
  const s = await idn.getLiveSessions([])
  console.log(JSON.stringify({ platform: 'idn', count: s.length }))
} catch (error) {
  console.error(JSON.stringify({ platform: 'idn', controlledError: error instanceof Error ? error.message : String(error) }))
}

console.log('--- IDN monitored uuids (real getLivestreams source) ---')
const uuids = ['01506e57-d837-4a1e-8dd4-3e99e3489ac8', '12addeb8-6ec5-4cea-a3b4-ad86e9bfc8d1']
try {
  const s = await idn.getLiveSessions(uuids)
  console.log(JSON.stringify({ platform: 'idn', count: s.length, sample: s[0] || null }))
} catch (error) {
  console.error(JSON.stringify({ platform: 'idn', controlledError: error instanceof Error ? error.message : String(error) }))
}

console.log('--- IDN getMemberLiveStatus for a uuid with a real stream row ---')
try {
  const s = await idn.getMemberLiveStatus({ memberId: 'x', platformMemberId: 'f001ba66-3c51-4849-9afa-13cf74eb1571' })
  console.log(JSON.stringify({ platform: 'idn', memberLive: s }))
} catch (error) {
  console.error(JSON.stringify({ platform: 'idn', controlledError: error instanceof Error ? error.message : String(error) }))
}
