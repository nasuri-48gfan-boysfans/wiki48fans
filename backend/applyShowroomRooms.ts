import { supabaseAdmin } from './supabaseAdmin.js'

/**
 * Apply the authoritative official SHOWROOM room ids for JKT48 members.
 *
 * Each id was resolved from 48pedia socials.showroom / official aliases ->
 * SHOWROOM `JKT48_<livery>` url_key -> room/status, and manually verified by
 * comparing the resolved SHOWROOM room name against the member's livery/alias.
 *
 * Members whose official room could not be authoritatively verified are
 * explicitly NULLed instead of being left with a stale JKT48Connect room id
 * (connect's ids do not match SHOWROOM's live room ids, so they never fire).
 *
 * Usage: npx tsx backend/applyShowroomRooms.ts [--dry-run]
 */
const dryRun = process.argv.includes('--dry-run')

// Authoritative official SHOWROOM room ids, verified 2026-08-30 (room name matches livery/alias).
const OFFICIAL: Record<string, string> = {
  ABIGAIL_RACHEL: '509985',      // JKT48_Aralie   Aralie
  ADELINE_WIJAYA: '509992',      // JKT48_Delynn   Delynn
  AFERA_THALIA: '572589',        // JKT48_Fera     alias Fera
  ALYA_AMANDA: '461451',         // JKT48_Alya
  ANGELINA_CHRISTY: '318112',    // JKT48_Christy
  ANINDYA_RAMADHANI: '461452',   // JKT48_Anindya
  ASTRELLA_VIRGIANANDA: '547061',// JKT48_Virgi
  AURELLIA: '400713',            // JKT48_Lia
  AURHEL_ALANA: '509997',        // JKT48_Lana
  BONG_APRILLI: '547063',        // JKT48_Rilly
  CARISSA_DINI: '572572',        // JKT48_Carissa
  CATHERINA_VALLENCIA: '510000', // JKT48_Erine
  CELLINE_THEFANI: '461475',     // JKT48_Elin
  CHRISTABELLA_BONITA: '572573', // JKT48_Bella    alias Bella
  CORNELIA_VANISA: '318218',     // JKT48_Oniel
  CYNTHIA_YAPUTERA: '461463',    // JKT48_Cynthia
  DENA_NATALIA: '461466',        // JKT48_Danella alias
  DESY_NATALIA: '461465',        // JKT48_Daisy    alias
  FEBRIOLA_SINAMBELA: '318222',  // JKT48_Olla
  FENI_FITRIYANTI: '317738',     // JKT48_Feni
  FIONY_ALVERIA: '318223',       // JKT48_Fiony
  FREYA_JAYAWARDANA: '318225',   // JKT48_Freya
  FRITZY_ROSMERIAN: '510011',    // JKT48_Fritzy
  GABRIELA_ABIGAIL: '400715',    // JKT48_Ella
  GITA_SEKAR_ANDARINI: '318117', // JKT48_Gita
  GRACE_OCTAVIANI: '461478',     // JKT48_Gracie
  GREESELLA_ADHALIA: '461479',   // JKT48_Greesel
  HAGIA_SOPIA: '547067',         // JKT48_Giaa
  HELISMA_PUTRI: '318118',       // JKT48_Eli
  HILLARY_ABIGAIL: '510012',     // JKT48_Lily
  HUMAIRA_RAMADHANI: '547064',   // JKT48_Maira
  INDAH_CAHYA: '318227',         // JKT48_Indah
  JACQUELINE_IMMANUELA: '547065',// JKT48_Ekin
  JAZZLYN_TRISHA: '510013',      // JKT48_Trisha
  JEMIMA_EVODIE: '547072',       // JKT48_Jemima
  JESSICA_CHANDRA: '318228',     // JKT48_Jessi
  JESSLYN_ELLY: '400717',        // JKT48_Lyn
  KATHRINA_IRENE: '318230',      // JKT48_Kathrina
  LULU_SALSABILA: '318232',      // JKT48_Lulu
  MARSHA_LENATHEA: '318233',     // JKT48_Marsha
  MICHELLE_ALEXANDRA: '461481',  // JKT48_Michie
  MICHELLE_LEVIA: '510016',      // JKT48_Levi
  MIKAELA_KUSJANTO: '547066',    // JKT48_Mikaela
  MUTIARA_AZZAHRA: '318204',     // JKT48_Muthe
  NAYLA_SUJI: '510064',          // JKT48_Nayla
  NINA_TUTACHIA: '510065',       // JKT48_Nachia
  NUR_INTAN: '547073',           // JKT48_Intan
  RAISHA_SYIFA: '400718',        // JKT48_Raisha
  RIBKA_BUDIMAN: '510070',       // JKT48_Ribka
  SHABILQIS_NAILA: '510071',     // JKT48_Nala
  VICTORIA_KIMBERLY: '510073',   // JKT48_Kimmy
}

// Members that still hold a stale JKT48Connect room id but whose official
// SHOWROOM room could not be verified: clear them rather than keep a wrong id.
const STALE_CLEAR: string[] = ['AULIA_RIZA', 'OLINE_MANUEL']

// Members with NO official SHOWROOM room (trainee-stage / no personal room):
// ensure they stay NULL (no-op safety).
const KNOWN_NULL: string[] = [
  'CATHLEEN_NIXIE', 'FATIMAH_AZZAHRA', 'FAHIRA_PUTRI', 'GENDIS_MAYRANNISA',
  'HEIDI_SUYANGGA', 'ISHA_KIRANA', 'LEGACY_141', 'MAURA_NILAMBARI',
  'MAXINE_FAYE', 'PIA_MERALEO', 'PUTRY_JAZYTA', 'RALYNE_VAN_IRWAN',
  'SAMI_MAONO', 'SONA_KALYANA', 'TANA_NONA',
]

const { data: members, error } = await supabaseAdmin.from('members').select('source_identifier').eq('source', '48pedia')
if (error) { console.error('query err:', error.message); process.exit(1) }
const codes = new Set(members.map((m) => m.source_identifier as string))
// include connect-only members
const conn = await supabaseAdmin.from('members').select('source_identifier').eq('source', 'jkt48connect')
for (const c of (conn.data || [])) codes.add(c.source_identifier as string)

let applied = 0, cleared = 0, skipped = 0
async function setRoom(code: string, value: string | null) {
  if (!codes.has(code)) { return }
  const { error: uerr } = await supabaseAdmin.from('members').update({ showroom_room_id: value }).eq('source_identifier', code)
  if (uerr) { console.error(`  update ${code} err: ${uerr.message}`); return }
  if (value === null) { cleared += 1 } else { applied += 1 }
}

if (!dryRun) console.log('APPLYING authoritative SHOWROOM room ids...')
for (const [code, id] of Object.entries(OFFICIAL)) { if (dryRun) console.log(`[set] ${code} -> ${id}`); else await setRoom(code, id) }
for (const code of STALE_CLEAR) { if (dryRun) console.log(`[clear] ${code} -> NULL`); else await setRoom(code, null) }
for (const code of KNOWN_NULL) skipped += 1

console.log(dryRun
  ? `DRY RUN: official=${Object.keys(OFFICIAL).length} stale-clear=${STALE_CLEAR.length} known-null=${KNOWN_NULL.length}`
  : `DONE applied=${applied} cleared=${cleared} known-null-untouched=${skipped}`)