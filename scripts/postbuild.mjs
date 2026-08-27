import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, '.vitepress/dist')
const staticExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg'])

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

function copyStaticAssets(source, destination) {
  if (!existsSync(source)) return 0
  mkdirSync(destination, { recursive: true })

  let copied = 0
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = join(source, entry.name)
    const destinationPath = join(destination, entry.name)
    if (entry.isDirectory()) {
      copied += copyStaticAssets(sourcePath, destinationPath)
    } else if (
      entry.isFile() &&
      staticExtensions.has(extname(entry.name).toLowerCase())
    ) {
      copyFileSync(sourcePath, destinationPath)
      copied += 1
    }
  }
  return copied
}

const notesRoot = resolveNotesRoot()
for (const name of seriesNames(notesRoot)) {
  aliasReadme(name)
  const copied = copyStaticAssets(
    resolve(root, name, 'assets'),
    resolve(dist, name, 'assets'),
  )
  if (copied > 0) {
    console.log(`postbuild: copied ${copied} static assets for ${name}`)
  }
}
