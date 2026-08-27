const MIN_SCALE = 0.35
const MAX_SCALE = 8
const STEP = 1.18
const PADDING = 40

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function wrapAll(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('.vp-doc .mermaid').forEach(wrapDiagram)
}

function wrapDiagram(el: HTMLElement) {
  if (el.closest('.mermaid-viewport')) return
  if (!el.querySelector('svg')) return

  const viewport = document.createElement('div')
  viewport.className = 'mermaid-viewport'
  viewport.setAttribute('tabindex', '0')
  viewport.setAttribute('aria-label', '可缩放的示意图')

  const canvas = document.createElement('div')
  canvas.className = 'mermaid-canvas'

  el.parentNode?.insertBefore(viewport, el)
  canvas.appendChild(el)
  viewport.appendChild(canvas)

  const controls = document.createElement('div')
  controls.className = 'mermaid-zoom-controls'
  controls.innerHTML = [
    '<button type="button" data-zoom="in" aria-label="放大" title="放大">+</button>',
    '<button type="button" data-zoom="out" aria-label="缩小" title="缩小">−</button>',
    '<button type="button" data-zoom="reset" aria-label="重置缩放" title="重置">重置</button>',
  ].join('')
  viewport.appendChild(controls)

  bindZoom(viewport, canvas, el)
}

function naturalSize(svg: SVGSVGElement) {
  let width = 0
  let height = 0
  try {
    const bbox = svg.getBBox()
    width = Math.max(width, bbox.width)
    height = Math.max(height, bbox.height)
  } catch {
    /* SVG may not be in the layout tree yet */
  }
  const box = svg.viewBox.baseVal
  if (box && box.width > 0 && box.height > 0) {
    width = Math.max(width, box.width)
    height = Math.max(height, box.height)
  }
  const attrWidth = Number.parseFloat(svg.getAttribute('width') || '')
  const attrHeight = Number.parseFloat(svg.getAttribute('height') || '')
  if (attrWidth > 0) width = Math.max(width, attrWidth)
  if (attrHeight > 0) height = Math.max(height, attrHeight)
  return { width: width + 16, height: height + 16 }
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

function bindZoom(viewport: HTMLElement, canvas: HTMLElement, stage: HTMLElement) {
  let scale = 1
  let baseWidth = 0
  let baseHeight = 0
  let svgEl: SVGSVGElement | null = null
  let scalerEl: HTMLElement | null = null
  let userAdjusted = false

  const ensureBaseSize = () => {
    const svg = stage.querySelector('svg')
    if (!(svg instanceof SVGSVGElement)) return null
    scalerEl = ensureScaler(svg)
    if (svg !== svgEl) {
      svgEl = svg
      const size = naturalSize(svg)
      baseWidth = size.width
      baseHeight = size.height
      svg.setAttribute('width', String(baseWidth))
      svg.setAttribute('height', String(baseHeight))
      svg.style.width = `${baseWidth}px`
      svg.style.height = `${baseHeight}px`
      svg.style.maxWidth = 'none'
    }
    return svg
  }

  const fitScale = () => {
    if (!baseWidth || !baseHeight) return 1
    const availW = Math.max(1, canvas.clientWidth - PADDING * 2)
    const availH = Math.max(1, canvas.clientHeight - PADDING * 2)
    return clamp(Math.min(availW / baseWidth, availH / baseHeight), MIN_SCALE, MAX_SCALE)
  }

  const applySize = () => {
    const svg = ensureBaseSize()
    if (!svg || !baseWidth || !scalerEl) return
    const width = baseWidth * scale
    const height = baseHeight * scale
    svg.style.transform = `scale(${scale})`
    svg.style.transformOrigin = '0 0'
    scalerEl.style.width = `${width}px`
    scalerEl.style.height = `${height}px`
    stage.style.minWidth = `${Math.max(canvas.clientWidth, width + PADDING * 2)}px`
    stage.style.minHeight = `${Math.max(canvas.clientHeight, height + PADDING * 2)}px`
  }

  const centerView = () => {
    applySize()
    canvas.scrollLeft = Math.max(0, (stage.offsetWidth - canvas.clientWidth) / 2)
    canvas.scrollTop = Math.max(0, (stage.offsetHeight - canvas.clientHeight) / 2)
  }

  const fitAndCenter = () => {
    ensureBaseSize()
    scale = fitScale()
    centerView()
  }

  const zoomAt = (clientX: number, clientY: number, nextScale: number) => {
    if (!ensureBaseSize()) return
    userAdjusted = true
    const next = clamp(nextScale, MIN_SCALE, MAX_SCALE)
    const rect = canvas.getBoundingClientRect()
    const offsetX = clientX - rect.left
    const offsetY = clientY - rect.top
    const contentX = offsetX + canvas.scrollLeft
    const contentY = offsetY + canvas.scrollTop
    const ratio = next / scale
    scale = next
    applySize()
    canvas.scrollLeft = contentX * ratio - offsetX
    canvas.scrollTop = contentY * ratio - offsetY
  }

  const scheduleFit = () => {
    requestAnimationFrame(() => {
      if (canvas.clientWidth < 8) {
        scheduleFit()
        return
      }
      if (!userAdjusted) fitAndCenter()
    })
  }

  scheduleFit()

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      const factor = event.deltaY > 0 ? 1 / STEP : STEP
      zoomAt(event.clientX, event.clientY, scale * factor)
    },
    { passive: false },
  )

  viewport.querySelectorAll<HTMLButtonElement>('button[data-zoom]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      const rect = canvas.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const action = button.dataset.zoom
      if (action === 'in') zoomAt(cx, cy, scale * STEP)
      else if (action === 'out') zoomAt(cx, cy, scale / STEP)
      else {
        userAdjusted = false
        fitAndCenter()
      }
    })
  })

  let dragging = false
  let lastX = 0
  let lastY = 0

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true
    userAdjusted = true
    lastX = event.clientX
    lastY = event.clientY
    viewport.classList.add('is-panning')
    canvas.setPointerCapture(event.pointerId)
  })

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return
    canvas.scrollLeft -= event.clientX - lastX
    canvas.scrollTop -= event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY
  })

  const stopPan = (event: PointerEvent) => {
    if (!dragging) return
    dragging = false
    viewport.classList.remove('is-panning')
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }

  canvas.addEventListener('pointerup', stopPan)
  canvas.addEventListener('pointercancel', stopPan)

  const resizeObserver = new ResizeObserver(() => {
    if (!userAdjusted) fitAndCenter()
  })
  resizeObserver.observe(canvas)
}

let observer: MutationObserver | null = null

export function enableMermaidZoom() {
  observer?.disconnect()
  const root = document.querySelector('#VPContent') ?? document.body
  wrapAll(root)
  observer = new MutationObserver(() => wrapAll(root))
  observer.observe(root, { childList: true, subtree: true })
}
