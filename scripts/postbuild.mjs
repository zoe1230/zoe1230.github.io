import { copyFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, '.vitepress/dist')

function resolveNotesRoot() {
  const sibling = resolve(root, '../notes')
  const ci = resolve(root, '.notes')
  if (existsSync(join(sibling, 'README.md'))) return sibling
  if (existsSync(join(ci, 'README.md'))) return ci
  throw new Error('postbuild: notes not found at ../notes or .notes')
}

function seriesNames(notesRoot) {
  return readdirSync(notesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(notesRoot, name, 'README.md')))
}

function aliasReadme(dirName) {
  const indexHtml = resolve(dist, dirName, 'index.html')
  const readmeHtml = resolve(dist, dirName, 'README.html')
  if (!existsSync(indexHtml)) {
    console.error('postbuild: missing', indexHtml)
    process.exit(1)
  }
  copyFileSync(indexHtml, readmeHtml)
  console.log('postbuild: wrote', readmeHtml)
}

for (const name of seriesNames(resolveNotesRoot())) {
  aliasReadme(name)
}
