import { copyFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, '.vitepress/dist')

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

aliasReadme('generative-foundations')
aliasReadme('fine-detail-depth')
