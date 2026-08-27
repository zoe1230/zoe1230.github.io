import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function resolveNotesRoot() {
  const sibling = resolve(root, '../notes')
  const ci = resolve(root, '.notes')
  if (existsSync(join(sibling, 'README.md'))) return sibling
  if (existsSync(join(ci, 'README.md'))) return ci
  throw new Error(
    'prepare-content: notes not found. Clone zoe1230/notes next to this repo, or checkout it to .notes in CI.',
  )
}

function seriesNames(notesRoot) {
  return readdirSync(notesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(notesRoot, name, 'README.md')))
}

function copyMarkdown(src, dest) {
  mkdirSync(dest, { recursive: true })
  for (const name of readdirSync(src)) {
    if (!name.endsWith('.md')) continue
    copyFileSync(join(src, name), join(dest, name))
  }
}

function ensureIndex(dest) {
  const index = join(dest, 'index.md')
  const readme = join(dest, 'README.md')
  if (!existsSync(readme)) {
    console.warn('prepare-content: missing README.md in', dest)
    return
  }
  if (!existsSync(index)) {
    writeFileSync(index, '<!--@include: ./README.md-->\n', 'utf8')
    console.log('prepare-content: wrote', index)
  }
}

const notesRoot = resolveNotesRoot()
const series = seriesNames(notesRoot)
if (series.length === 0) {
  throw new Error(`prepare-content: no series folders with README.md in ${notesRoot}`)
}

for (const name of series) {
  const src = join(notesRoot, name)
  const dest = join(root, name)
  copyMarkdown(src, dest)
  ensureIndex(dest)
  console.log(`prepare-content: copied ${name} from ${src}`)
}
