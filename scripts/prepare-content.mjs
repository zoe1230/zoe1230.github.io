import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const jobs = [
  {
    src: resolve(root, '../tutorial-generative-foundations'),
    dest: resolve(root, 'generative-foundations'),
  },
  {
    src: resolve(root, '../tutorial-fine-detail-depth'),
    dest: resolve(root, 'fine-detail-depth'),
  },
]

function copyMarkdown(src, dest) {
  if (!existsSync(src)) return false
  mkdirSync(dest, { recursive: true })
  for (const name of readdirSync(src)) {
    if (!name.endsWith('.md')) continue
    copyFileSync(join(src, name), join(dest, name))
  }
  return true
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

for (const job of jobs) {
  const copied = copyMarkdown(job.src, job.dest)
  console.log(
    copied
      ? `prepare-content: copied markdown from ${job.src}`
      : `prepare-content: no sibling source at ${job.src}; using ${job.dest}`,
  )
  ensureIndex(job.dest)
}
