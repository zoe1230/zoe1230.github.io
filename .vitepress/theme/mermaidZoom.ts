const MIN_SCALE = 0.02
const MAX_SCALE = 8
const STEP = 1.18
const VIEWER_PADDING = 36
const PREVIEW_PADDING = 14
const MAX_PREVIEW_HEIGHT = 480

type PreviewState = {
  refresh: () => void
  disconnect: () => void
}

const previewStates = new Map<HTMLElement, PreviewState>()
let contentObserver: MutationObserver | null = null
let activeViewer: HTMLElement | null = null
let activeViewerCleanup: (() => void) | null = null
let previousBodyOverflow = ''

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function naturalSvgSize(svg: SVGSVGElement) {
  const viewBox = svg.viewBox.baseVal
  if (viewBox?.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height }
  }

  let width = 0
  let height = 0
  try {
    const bbox = svg.getBBox()
    width = bbox.width
    height = bbox.height
  } catch {
    /* The SVG may not be in the layout tree yet. */
  }

  const attrWidth = Number.parseFloat(svg.getAttribute('width') || '')
  const attrHeight = Number.parseFloat(svg.getAttribute('height') || '')
  if (!width && attrWidth > 0) width = attrWidth
  if (!height && attrHeight > 0) height = attrHeight

  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  }
}

function ensureScaler(svg: SVGSVGElement) {
  const parent = svg.parentElement
  if (parent?.classList.contains('mermaid-scaler')) return parent

  const scaler = document.createElement('div')
  scaler.className = 'mermaid-scaler'
  svg.parentNode?.insertBefore(scaler, svg)
  scaler.appendChild(svg)
  return scaler
}

function uniquifySvgIds(svg: SVGSVGElement) {
  const prefix = `media-viewer-${Date.now().toString(36)}-`
  const idMap = new Map<string, string>()
  const elements = [svg, ...svg.querySelectorAll<SVGElement>('[id]')]

  elements.forEach((element) => {
    if (!element.id) return
    const nextId = `${prefix}${element.id}`
    idMap.set(element.id, nextId)
    element.id = nextId
  })

  const replaceReferences = (value: string) => {
    let result = value
    const references = [...idMap].sort(([a], [b]) => b.length - a.length)
    references.forEach(([oldId, nextId]) => {
      result = result
        .replaceAll(`url(#${oldId})`, `url(#${nextId})`)
        .replaceAll(`#${oldId}`, `#${nextId}`)
    })
    return result
  }

  ;[svg, ...svg.querySelectorAll<SVGElement>('*')].forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const replaced = replaceReferences(attribute.value)
      if (replaced !== attribute.value) element.setAttribute(attribute.name, replaced)
    }
  })

  svg.querySelectorAll('style').forEach((style) => {
    style.textContent = replaceReferences(style.textContent || '')
  })
}

function closeViewer() {
  if (!activeViewer) return
  activeViewerCleanup?.()
  activeViewerCleanup = null
  activeViewer.remove()
  activeViewer = null
  document.body.style.overflow = previousBodyOverflow
}

function createViewerControls(
  zoom: (factor: number) => void,
  reset: () => void,
) {
  const controls = document.createElement('div')
  controls.className = 'media-viewer-controls'
  controls.innerHTML = [
    '<button type="button" data-action="in" aria-label="放大" title="放大">+</button>',
    '<button type="button" data-action="out" aria-label="缩小" title="缩小">−</button>',
    '<button type="button" data-action="reset" aria-label="重置" title="重置">重置</button>',
    '<button type="button" data-action="close" aria-label="关闭" title="关闭">×</button>',
  ].join('')

  controls.addEventListener('pointerdown', (event) => event.stopPropagation())
  controls.addEventListener('click', (event) => {
    event.stopPropagation()
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      'button[data-action]',
    )
    if (!button) return
    if (button.dataset.action === 'in') zoom(STEP)
    else if (button.dataset.action === 'out') zoom(1 / STEP)
    else if (button.dataset.action === 'reset') reset()
    else closeViewer()
  })

  return controls
}

function openViewer(media: HTMLImageElement | SVGSVGElement) {
  closeViewer()

  const overlay = document.createElement('div')
  overlay.className = 'media-viewer is-loading'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', '图片查看器')

  const stage = document.createElement('div')
  stage.className = 'media-viewer-stage'
  const content = document.createElement('div')
  content.className = 'media-viewer-content'
  content.appendChild(media)
  stage.appendChild(content)
  overlay.appendChild(stage)

  const status = document.createElement('div')
  status.className = 'media-viewer-status'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  status.textContent = '图片加载中…'
  overlay.appendChild(status)

  let baseWidth = 1
  let baseHeight = 1
  let scale = 1
  let x = 0
  let y = 0

  const applyTransform = () => {
    content.style.width = `${baseWidth}px`
    content.style.height = `${baseHeight}px`
    content.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
  }

  const reset = () => {
    const availableWidth = Math.max(1, stage.clientWidth - VIEWER_PADDING * 2)
    const availableHeight = Math.max(1, stage.clientHeight - VIEWER_PADDING * 2)
    scale = clamp(
      Math.min(availableWidth / baseWidth, availableHeight / baseHeight),
      MIN_SCALE,
      2,
    )
    x = (stage.clientWidth - baseWidth * scale) / 2
    y = (stage.clientHeight - baseHeight * scale) / 2
    applyTransform()
  }

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const rect = stage.getBoundingClientRect()
    const pointX = clientX - rect.left
    const pointY = clientY - rect.top
    const mediaX = (pointX - x) / scale
    const mediaY = (pointY - y) / scale
    const nextScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE)
    x = pointX - mediaX * nextScale
    y = pointY - mediaY * nextScale
    scale = nextScale
    applyTransform()
  }

  const zoomFromCenter = (factor: number) => {
    const rect = stage.getBoundingClientRect()
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor)
  }

  overlay.appendChild(createViewerControls(zoomFromCenter, reset))

  stage.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      zoomAt(event.clientX, event.clientY, event.deltaY > 0 ? 1 / STEP : STEP)
    },
    { passive: false },
  )

  let dragging = false
  let lastX = 0
  let lastY = 0

  content.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    event.preventDefault()
    dragging = true
    lastX = event.clientX
    lastY = event.clientY
    overlay.classList.add('is-panning')
    content.setPointerCapture(event.pointerId)
  })

  content.addEventListener('pointermove', (event) => {
    if (!dragging) return
    const dx = event.clientX - lastX
    const dy = event.clientY - lastY
    x += dx
    y += dy
    lastX = event.clientX
    lastY = event.clientY
    applyTransform()
  })

  const stopPan = (event: PointerEvent) => {
    if (!dragging) return
    dragging = false
    overlay.classList.remove('is-panning')
    if (content.hasPointerCapture(event.pointerId)) {
      content.releasePointerCapture(event.pointerId)
    }
  }

  content.addEventListener('pointerup', (event) => stopPan(event))
  content.addEventListener('pointercancel', (event) => stopPan(event))
  stage.addEventListener('click', (event) => {
    if (event.target === stage) closeViewer()
  })

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeViewer()
  }
  document.addEventListener('keydown', onKeydown)
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.body.appendChild(overlay)
  activeViewer = overlay

  const finishLoading = () => {
    overlay.classList.remove('is-loading', 'has-error')
    status.remove()
  }

  const showError = () => {
    overlay.classList.remove('is-loading')
    overlay.classList.add('has-error')
    status.textContent = '图片加载失败，请关闭后重试'
  }

  const initialize = () => {
    if (media instanceof SVGSVGElement) {
      const size = naturalSvgSize(media)
      baseWidth = size.width
      baseHeight = size.height
      media.setAttribute('width', String(baseWidth))
      media.setAttribute('height', String(baseHeight))
    } else {
      if (!media.naturalWidth || !media.naturalHeight) {
        showError()
        return
      }
      baseWidth = media.naturalWidth
      baseHeight = media.naturalHeight
      media.width = baseWidth
      media.height = baseHeight
    }
    reset()
    finishLoading()
  }

  const onLoad = () => initialize()
  const onError = () => showError()
  activeViewerCleanup = () => {
    document.removeEventListener('keydown', onKeydown)
    media.removeEventListener('load', onLoad)
    media.removeEventListener('error', onError)
  }

  if (media instanceof HTMLImageElement) {
    media.addEventListener('error', onError, { once: true })
    if (!media.complete) {
      media.addEventListener('load', onLoad, { once: true })
    } else if (media.naturalWidth > 0) {
      initialize()
    } else {
      showError()
    }
  } else {
    initialize()
  }
}

function preparePaperFigures(root: ParentNode) {
  root
    .querySelectorAll<HTMLAnchorElement>('.vp-doc .paper-figure a[href]')
    .forEach((link) => {
      if (link.dataset.mediaViewerBound === 'true') return
      const image = link.querySelector<HTMLImageElement>('img')
      if (!image) return

      link.dataset.mediaViewerBound = 'true'
      link.addEventListener('click', (event) => {
        event.preventDefault()
        const enlarged = new Image()
        enlarged.alt = image.alt
        enlarged.decoding = 'async'
        enlarged.src = image.currentSrc || image.src || link.href
        openViewer(enlarged)
      })
    })
}

function fitMermaidPreview(viewport: HTMLElement, stage: HTMLElement) {
  const svg = stage.querySelector('svg')
  if (!(svg instanceof SVGSVGElement)) return
  const scaler = ensureScaler(svg)
  const size = naturalSvgSize(svg)
  const availableWidth = Math.max(1, viewport.clientWidth - PREVIEW_PADDING * 2)
  const availableHeight = MAX_PREVIEW_HEIGHT - PREVIEW_PADDING * 2
  const scale = Math.min(
    1,
    availableWidth / size.width,
    availableHeight / size.height,
  )
  const width = size.width * scale
  const height = size.height * scale

  svg.setAttribute('width', String(size.width))
  svg.setAttribute('height', String(size.height))
  svg.style.width = `${size.width}px`
  svg.style.height = `${size.height}px`
  svg.style.maxWidth = 'none'
  svg.style.transform = `scale(${scale})`
  svg.style.transformOrigin = '0 0'
  scaler.style.width = `${width}px`
  scaler.style.height = `${height}px`
  viewport.style.height = `${height + PREVIEW_PADDING * 2}px`
}

function prepareMermaid(el: HTMLElement) {
  const svg = el.querySelector('svg')
  if (!(svg instanceof SVGSVGElement)) return

  let viewport = el.closest<HTMLElement>('.mermaid-viewport')
  if (!viewport) {
    viewport = document.createElement('div')
    viewport.className = 'mermaid-viewport'
    const canvas = document.createElement('div')
    canvas.className = 'mermaid-canvas'
    el.parentNode?.insertBefore(viewport, el)
    canvas.appendChild(el)
    viewport.appendChild(canvas)
  }

  viewport.setAttribute('tabindex', '0')
  viewport.setAttribute('role', 'button')
  viewport.setAttribute('aria-label', '点击放大示意图')
  viewport.setAttribute('title', '点击放大')
  viewport.querySelector('.mermaid-zoom-controls')?.remove()

  const existing = previewStates.get(viewport)
  if (existing) {
    existing.refresh()
    return
  }

  const refresh = () => {
    requestAnimationFrame(() => fitMermaidPreview(viewport!, el))
  }
  const resizeObserver = new ResizeObserver(refresh)
  resizeObserver.observe(viewport)
  previewStates.set(viewport, {
    refresh,
    disconnect: () => resizeObserver.disconnect(),
  })

  viewport.addEventListener('click', () => {
    const currentSvg = el.querySelector('svg')
    if (!(currentSvg instanceof SVGSVGElement)) return
    const enlarged = currentSvg.cloneNode(true) as SVGSVGElement
    uniquifySvgIds(enlarged)
    enlarged.removeAttribute('style')
    openViewer(enlarged)
  })
  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      viewport?.click()
    }
  })
  refresh()
}

function prepareContent(root: ParentNode) {
  preparePaperFigures(root)
  root.querySelectorAll<HTMLElement>('.vp-doc .mermaid').forEach(prepareMermaid)
}

export function enableMermaidZoom() {
  contentObserver?.disconnect()
  previewStates.forEach((state) => state.disconnect())
  previewStates.clear()
  closeViewer()
  const root = document.querySelector('#VPContent') ?? document.body
  prepareContent(root)
  contentObserver = new MutationObserver(() => prepareContent(root))
  contentObserver.observe(root, { childList: true, subtree: true })
}
