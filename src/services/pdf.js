import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

/**
 * Loads a PDF document from a URL or ArrayBuffer.
 */
export async function loadPdfDocument(source) {
  let param = source
  if (source instanceof ArrayBuffer || (typeof Uint8Array !== 'undefined' && source instanceof Uint8Array)) {
    param = { data: source }
  }
  const loadingTask = pdfjsLib.getDocument(param)
  return loadingTask.promise
}

/**
 * Generates a thumbnail data URL from the first page of a PDF document.
 */
export async function generateCoverThumbnail(pdfDoc, width = 360) {
  try {
    const page = await pdfDoc.getPage(1)
    const unscaledViewport = page.getViewport({ scale: 1.0 })
    const scale = width / unscaledViewport.width
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise

    return canvas.toDataURL('image/webp', 0.85)
  } catch (err) {
    console.warn('Could not generate cover thumbnail:', err)
    return null
  }
}

/**
 * Renders a specific page onto an HTML5 canvas element with high-DPI supersampling.
 * Guarantees razor-sharp vector clarity when zoomed up to 300%.
 */
export async function renderPageToCanvas(pdfDoc, pageNumber, canvas, containerWidth, zoom = 1.0) {
  if (!pdfDoc || !canvas) return null

  // Cancel any ongoing render task on this canvas before starting a new one
  if (canvas._currentRenderTask) {
    try {
      canvas._currentRenderTask.cancel()
    } catch {
      // Ignored
    }
    canvas._currentRenderTask = null
  }

  const page = await pdfDoc.getPage(pageNumber)

  // High-DPI backing store: multiply base dpr by zoom scale so that when CSS scales the canvas,
  // the physical pixel backing store matches the magnified screen resolution.
  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 2.5)
  const effectiveZoom = Math.max(1.0, Math.min(zoom || 1.0, 3.0))

  const unscaledViewport = page.getViewport({ scale: 1.0 })
  const baseScale = containerWidth / unscaledViewport.width
  const displayViewport = page.getViewport({ scale: baseScale })

  // Max dimension safeguard to respect mobile GPU memory limits
  const maxDimension = 4096
  const targetScale = baseScale * dpr * effectiveZoom
  const clampedScale = Math.min(targetScale, maxDimension / Math.max(unscaledViewport.width, unscaledViewport.height))
  const renderViewport = page.getViewport({ scale: clampedScale })

  // High-resolution physical pixel dimensions for canvas backing store
  canvas.width = Math.floor(renderViewport.width)
  canvas.height = Math.floor(renderViewport.height)

  // CSS display size matches displayViewport (unscaled, parent CSS transform handles zoom magnification)
  canvas.style.width = `${Math.floor(displayViewport.width)}px`
  canvas.style.height = `${Math.floor(displayViewport.height)}px`

  const ctx = canvas.getContext('2d')

  // Render directly at high resolution renderViewport for vector-sharp clarity
  const renderTask = page.render({
    canvasContext: ctx,
    viewport: renderViewport,
  })
  canvas._currentRenderTask = renderTask

  try {
    await renderTask.promise
  } catch (err) {
    if (err?.name === 'RenderingCancelledException') {
      return null
    }
    throw err
  } finally {
    if (canvas._currentRenderTask === renderTask) {
      canvas._currentRenderTask = null
    }
  }

  return {
    viewport: displayViewport,
    pageWidth: Math.floor(displayViewport.width),
    pageHeight: Math.floor(displayViewport.height),
    scale: baseScale,
  }
}

/**
 * Pre-renders a specific page to an off-screen cache with high-DPI supersampling.
 * Used for zero-delay instant flipping of adjacent pages (N-1 and N+1).
 */
export async function renderPageToCache(pdfDoc, pageNumber, containerWidth) {
  const page = await pdfDoc.getPage(pageNumber)
  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 2.5)

  const unscaledViewport = page.getViewport({ scale: 1.0 })
  const baseScale = containerWidth / unscaledViewport.width
  const displayViewport = page.getViewport({ scale: baseScale })
  const renderViewport = page.getViewport({ scale: baseScale * dpr })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(renderViewport.width)
  canvas.height = Math.floor(renderViewport.height)

  const ctx = canvas.getContext('2d')

  await page.render({
    canvasContext: ctx,
    viewport: renderViewport,
  }).promise

  const textContent = await page.getTextContent()

  return {
    pageNumber,
    dataUrl: canvas.toDataURL('image/webp', 0.95),
    width: Math.floor(displayViewport.width),
    height: Math.floor(displayViewport.height),
    scale: baseScale,
    viewport: displayViewport,
    textContent,
  }
}

/**
 * Retrieves text content items for building the text selection layer.
 */
export async function getPageTextContent(pdfDoc, pageNumber, viewport = null) {
  const page = await pdfDoc.getPage(pageNumber)
  const textContent = await page.getTextContent()
  const pageViewport = viewport || page.getViewport({ scale: 1.0 })
  return {
    textContent,
    viewport: pageViewport,
  }
}
