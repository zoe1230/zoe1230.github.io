import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
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

const contentExtensions = new Set(['.md', '.png', '.jpg', '.jpeg', '.webp', '.svg'])
const ignoredGeneratedDirs = new Set(
  readFileSync(join(root, '.gitignore'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\/[^/]+\/$/.test(line))
    .map((line) => line.slice(1, -1)),
)

function resetGeneratedSeries(dest, name) {
  const expected = resolve(root, name)
  if (
    resolve(dest) !== expected ||
    dirname(expected) !== root ||
    !ignoredGeneratedDirs.has(name)
  ) {
    throw new Error(`prepare-content: refusing to clean unexpected path ${dest}`)
  }
  rmSync(dest, { recursive: true, force: true })
}

function copyContent(src, dest) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const source = join(src, entry.name)
    const target = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyContent(source, target)
      continue
    }
    if (!entry.isFile() || !contentExtensions.has(extname(entry.name).toLowerCase())) continue
    copyFileSync(source, target)
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
  resetGeneratedSeries(dest, name)
  copyContent(src, dest)
  ensureIndex(dest)
  console.log(`prepare-content: copied ${name} from ${src}`)
}
