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
export async function renderPageToCanvas(pdfDoc, pageNumber, canvas, containerWidth, zoom = 1.0, containerHeight = null) {
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
  const scaleX = containerWidth / unscaledViewport.width
  const scaleY = containerHeight ? containerHeight / unscaledViewport.height : scaleX
  const baseScale = Math.min(scaleX, scaleY)
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
export async function renderPageToCache(pdfDoc, pageNumber, containerWidth, containerHeight = null) {
  const page = await pdfDoc.getPage(pageNumber)
  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 2.5)

  const unscaledViewport = page.getViewport({ scale: 1.0 })
  const scaleX = containerWidth / unscaledViewport.width
  const scaleY = containerHeight ? containerHeight / unscaledViewport.height : scaleX
  const baseScale = Math.min(scaleX, scaleY)
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

/**
 * Recursively extracts chapters from PDF outline or falls back to heuristic text parsing.
 * Returns an array of: { title: string, pageNumber: number, type: 'chapter', isAuto: true }
 */
export async function extractPdfChapters(pdfDoc) {
  if (!pdfDoc) return []

  try {
    const outline = await pdfDoc.getOutline()

    if (outline && outline.length > 0) {
      const chapters = []

      // Helper to resolve PDF destination to 1-based page number
      async function resolveDestination(dest) {
        if (!dest) return null
        let explicitDest = dest
        if (typeof dest === 'string') {
          explicitDest = await pdfDoc.getDestination(dest)
        }
        if (Array.isArray(explicitDest) && explicitDest.length > 0) {
          const pageRef = explicitDest[0]
          if (typeof pageRef === 'number') {
            return pageRef + 1
          }
          if (pageRef && typeof pageRef === 'object') {
            const pageIndex = await pdfDoc.getPageIndex(pageRef)
            return pageIndex !== null && pageIndex !== undefined ? pageIndex + 1 : null
          }
        }
        return null
      }

      async function traverseItems(items) {
        for (const item of items) {
          try {
            const pageNum = await resolveDestination(item.dest)
            if (pageNum && item.title) {
              chapters.push({
                title: item.title.trim().replace(/[\r\n]+/g, ' '),
                pageNumber: pageNum,
                type: 'chapter',
                isAuto: true,
              })
            }
          } catch (itemErr) {
            console.warn('Could not resolve destination for outline item:', item?.title, itemErr)
          }

          if (item.items && Array.isArray(item.items) && item.items.length > 0) {
            await traverseItems(item.items)
          }
        }
      }

      await traverseItems(outline)

      if (chapters.length > 0) {
        // Sort sequentially by page number and deduplicate by pageNumber + title
        const seen = new Set()
        const unique = []
        for (const ch of chapters.sort((a, b) => a.pageNumber - b.pageNumber)) {
          const key = `${ch.pageNumber}_${ch.title}`
          if (!seen.has(key)) {
            seen.add(key)
            unique.push(ch)
          }
        }
        return unique
      }
    }

    // Tier 2 Fallback: Heuristic scan on text content
    return await scanPagesForChapters(pdfDoc, Math.min(pdfDoc.numPages || 1, 60))
  } catch (err) {
    console.warn('Could not auto-extract PDF chapters:', err)
    return []
  }
}

/**
 * Fallback scanner inspecting text items on pages for chapter headings.
 */
async function scanPagesForChapters(pdfDoc, maxPages) {
  const chapterRegex = /^(?:chapter|part|section|book|act|scene)\s+([0-9ivxlcdm]+|[a-z]+)[\s:.-]*(.*)$/i
  const detected = []
  const seenPages = new Set()

  for (let i = 1; i <= maxPages; i++) {
    try {
      const page = await pdfDoc.getPage(i)
      const textContent = await page.getTextContent()
      if (!textContent || !textContent.items || textContent.items.length === 0) continue

      // Inspect first 15 text items on the page
      const sampleItems = textContent.items.slice(0, 15)
      for (const item of sampleItems) {
        const line = item.str ? item.str.trim() : ''
        if (line.length >= 4 && line.length <= 80 && chapterRegex.test(line)) {
          if (!seenPages.has(i)) {
            seenPages.add(i)
            detected.push({
              title: line,
              pageNumber: i,
              type: 'chapter',
              isAuto: true,
            })
            break
          }
        }
      }
    } catch {
      // Continue next page if one fails
    }
  }

  return detected
}

