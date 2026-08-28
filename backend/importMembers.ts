import { importMembers, type SourceAdapter } from './memberImporter.js'
import { supabaseAdmin } from './supabaseAdmin.js'
import { env } from './env.js'
import { Jkt48Adapter } from './memberAdapters/jkt48.js'
import { Jkt48ConnectAdapter } from './memberAdapters/jkt48connect.js'
import { FortyEightPediaAdapter } from './memberAdapters/48pedia.js'

/**
 * One adapter per (group, source). `--group` selects a group and uses its
 * default source; `--source` overrides the source for a group.
 */
const adapters: Record<string, Record<string, () => SourceAdapter>> = {
  jkt48: {
    '48pedia': () => new FortyEightPediaAdapter(env.JKT48_48PEDIA_API_KEY || ''),
    official: () => new Jkt48Adapter(),
    connect: () => new Jkt48ConnectAdapter(env.JKT48_CONNECT_API_KEY || ''),
  },
}

const DEFAULT_SOURCE: Record<string, string> = { jkt48: '48pedia' }

function availableSources(group: string): string[] {
  const sources = Object.keys(adapters[group] || {})
  return sources.filter((source) => {
    if (source === 'connect') return Boolean(env.JKT48_CONNECT_API_KEY)
    if (source === '48pedia') return Boolean(env.JKT48_48PEDIA_API_KEY)
    return true
  })
}

function parseArgs(argv: string[]): { group?: string; source?: string; mode: 'initial' | 'sync'; dryRun: boolean; all: boolean } {
  const args: Record<string, string | boolean> = {}
  for (const arg of argv) {
    if (arg === '--dry-run') { args.dryRun = true; continue }
    if (arg.startsWith('--group=')) { args.group = arg.slice('--group='.length); continue }
    if (arg.startsWith('--source=')) { args.source = arg.slice('--source='.length); continue }
    if (arg.startsWith('--mode=')) { args.mode = arg.slice('--mode='.length); continue }
    if (arg === '--sync') { args.mode = 'sync'; continue }
    if (arg === '--force') { args.mode = 'initial'; continue }
    if (arg.startsWith('--group')) { args.group = argv[argv.indexOf(arg) + 1]; continue }
    if (arg.startsWith('--source')) { args.source = argv[argv.indexOf(arg) + 1]; continue }
    if (arg.startsWith('--mode')) { args.mode = argv[argv.indexOf(arg) + 1]; continue }
  }
  const group = typeof args.group === 'string' ? args.group.toLowerCase() : undefined
  const source = typeof args.source === 'string' ? args.source.toLowerCase() : undefined
  const modeRaw = typeof args.mode === 'string' ? args.mode.toLowerCase() : 'initial'
  const mode = modeRaw === 'sync' ? 'sync' : 'initial'
  return { group, source, mode, dryRun: Boolean(args.dryRun), all: !group }
}

export async function seedGroups(): Promise<void> {
  const groups = [
    { name: 'JKT48', slug: 'jkt48', country: 'Indonesia', primary_color: '#e86f61', secondary_color: '#f2a65a', glow_color: '#e86f61', official_url: 'https://jkt48.com' },
    { name: 'AKB48', slug: 'akb48', country: 'Japan', primary_color: '#f77fbe', secondary_color: '#ffffff', glow_color: '#f77fbe', official_url: 'https://www.akb48.co.jp' },
    { name: 'SKE48', slug: 'ske48', country: 'Japan', primary_color: '#000000', secondary_color: '#fa9d00', glow_color: '#fa9d00', official_url: 'https://ske48.co.jp' },
    { name: 'NMB48', slug: 'nmb48', country: 'Japan', primary_color: '#f8b4c2', secondary_color: '#ffffff', glow_color: '#f8b4c2', official_url: 'https://www.nmb48.com' },
    { name: 'HKT48', slug: 'hkt48', country: 'Japan', primary_color: '#000000', secondary_color: '#ffffff', glow_color: '#ffffff', official_url: 'https://www.hkt48.jp' },
    { name: 'NGT48', slug: 'ngt48', country: 'Japan', primary_color: '#ffffff', secondary_color: '#00a4d8', glow_color: '#00a4d8', official_url: 'https://ngt48.jp' },
    { name: 'STU48', slug: 'stu48', country: 'Japan', primary_color: '#145a8a', secondary_color: '#ffffff', glow_color: '#145a8a', official_url: 'https://www.stu48.com' },
    { name: 'BNK48', slug: 'bnk48', country: 'Thailand', primary_color: '#3c8dbc', secondary_color: '#ffffff', glow_color: '#3c8dbc', official_url: 'https://www.bnk48.com' },
    { name: 'CGM48', slug: 'cgm48', country: 'Thailand', primary_color: '#5a3a8c', secondary_color: '#ffffff', glow_color: '#5a3a8c', official_url: 'https://www.cgm48.com' },
  ]
  for (const group of groups) {
    // groups.name is UNIQUE NOT NULL since 0001; groups.slug uses a partial
    // unique index (0004) that upstream cannot target with ON CONFLICT.
    const { error } = await supabaseAdmin.from('groups').upsert(group, { onConflict: 'name', ignoreDuplicates: false })
    if (error) throw new Error(`Failed to seed group "${group.slug}": ${error.message}. This usually means supabase/migrations/0004_members_import.sql has not been applied in the Supabase SQL Editor.`)
  }
}

async function main() {
  const { group, source, mode, dryRun, all } = parseArgs(process.argv.slice(2))

  const selectedGroups = all ? Object.keys(adapters) : [group as string]
  for (const slug of selectedGroups) {
    if (!adapters[slug]) {
      console.error(`Unknown group "${slug}". Supported groups: ${Object.keys(adapters).join(', ')}`)
      process.exit(1)
    }
  }

  if (selectedGroups.length === 0) {
    console.error('No group to import. Supported groups: ' + Object.keys(adapters).join(', '))
    process.exit(1)
  }

  await seedGroups()
  console.log(dryRun ? 'DRY RUN (no database writes)' : 'Import started')

  for (const slug of selectedGroups) {
    const sourceKey = source ?? DEFAULT_SOURCE[slug] ?? availableSources(slug)[0]
    if (!adapters[slug][sourceKey] || !availableSources(slug).includes(sourceKey)) {
      console.warn(`[${slug}] source "${sourceKey}" is not configured. Available: ${availableSources(slug).join(', ') || 'none (set the API key first)'}`)
      continue
    }
    console.log(dryRun ? `DRY RUN ${slug}/${sourceKey}` : `Importing ${slug} via ${sourceKey} (${mode})`)
    const adapter = adapters[slug][sourceKey]()
    try {
      const report = await importMembers(adapter, {
        dryRun,
        mode,
        onProgress: ({ done, total, code }) => {
          process.stdout.write(`\r[${done}/${total}] importing ${code} ...`)
        },
        onRateLimitWait: (seconds) => {
          process.stdout.write(`\r\nRate limit reached, waiting ${seconds}s...\n`)
        },
      })
      process.stdout.write('\n')
      console.log(`[${slug}/${sourceKey}] fetched=${report.fetched} list=${report.listCount} detailFetched=${report.detailFetched} detailCached=${report.detailSkippedCached} valid=${report.valid} skipped=${report.skipped} created=${report.created} updated=${report.updated} unchanged=${report.unchanged}`)
      for (const error of report.errors) console.warn(`  - ${error}`)
    } catch (error) {
      console.warn(`[${slug}/${sourceKey}] ${error instanceof Error ? error.message : String(error)}`)
    }
    if (!all) break
  }
  console.log('Import finished')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
