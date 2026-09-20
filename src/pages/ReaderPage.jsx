import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getBook,
  saveBook,
  updateReadingProgress,
  getHighlightsForPage,
  saveHighlight,
  deleteHighlight,
  getDrawingForPage,
  saveDrawing,
  isPageBookmarked,
  toggleBookmark,
  getBookmarksForBook,
  syncAutoChapters,
  deleteBookmark,
} from '../services/db'
import { getBookDownloadUrl } from '../services/storage'
import {
  loadPdfDocument,
  renderPageToCanvas,
  renderPageToCache,
  getPageTextContent,
  extractPdfChapters,
} from '../services/pdf'
import PageTurnContainer from '../components/reader/PageTurnContainer'
import DrawingCanvas from '../components/reader/DrawingCanvas'
import HighlightLayer from '../components/reader/HighlightLayer'
import { HIGHLIGHT_COLORS } from '../constants/highlights'
import ReaderControls from '../components/reader/ReaderControls'
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

export default function ReaderPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()

  const [book, setBook] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Layout & Scaling
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const pageTurnRef = useRef(null)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0, scale: 1.0 })
  const [textContent, setTextContent] = useState(null)
  const [pageCache, setPageCache] = useState({}) // { [pageNum]: pageData }

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)

  // Annotations State
  const [highlights, setHighlights] = useState([])
  const [activeHighlightColor, setActiveHighlightColor] = useState(HIGHLIGHT_COLORS[0])
  const [drawingStrokes, setDrawingStrokes] = useState([])
  const [drawingHistory, setDrawingHistory] = useState([]) // Undo stack
  const [drawingRedoStack, setDrawingRedoStack] = useState([]) // Redo stack
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarks, setBookmarks] = useState([])

  // Controls & Interaction State
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isDrawMode, setIsDrawMode] = useState(false)
  const [drawTool, setDrawTool] = useState('pen')
  const [drawColor, setDrawColor] = useState('#111113')
  const [drawWidth, setDrawWidth] = useState(3)

  // Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1000,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  })

  // 1. Initial Load of Book Metadata and PDF Document
  useEffect(() => {
    let isMounted = true

    async function initReader() {
      try {
        setIsLoading(true)
        setErrorMessage(null)

        const bookRecord = await getBook(bookId)
        if (!bookRecord) {
          throw new Error('This book could not be found in your library.')
        }

        if (!isMounted) return
        setBook(bookRecord)
        const initialPage = bookRecord.currentPosition || 1
        setCurrentPage(initialPage)

        // Retrieve download URL from R2 or local sample
        const pdfUrl = await getBookDownloadUrl(bookRecord.r2Key, bookRecord.isSample)
        const loadedDoc = await loadPdfDocument(pdfUrl)

        if (!isMounted) return
        setPdfDoc(loadedDoc)
        setTotalPages(loadedDoc.numPages)

        // Asynchronously auto-detect and sync chapters in background
        if (!bookRecord.chaptersIndexed) {
          extractPdfChapters(loadedDoc)
            .then(async (chapters) => {
              if (chapters && chapters.length > 0) {
                const updatedBookmarks = await syncAutoChapters(bookId, chapters)
                if (isMounted) {
                  setBookmarks(updatedBookmarks)
                }
              }
              await saveBook({ ...bookRecord, chaptersIndexed: true })
            })
            .catch((err) => {
              console.warn('Background chapter auto-detection error:', err)
            })
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Reader initialization error:', err)
        setErrorMessage(err.message || 'This book could not be opened.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    initReader()
    return () => {
      isMounted = false
    }
  }, [bookId])

  // 2. Load Page Content, Render Canvas & Pre-render Adjacent Pages
  const zoomLevelRef = useRef(zoomLevel)
  zoomLevelRef.current = zoomLevel

  const renderCurrentPage = useCallback(async (customZoom) => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return

    try {
      const containerWidth = containerRef.current.clientWidth || window.innerWidth
      const containerHeight = containerRef.current.clientHeight || window.innerHeight
      // Allocate width: leaving clear room for outside buttons on desktop, or full comfortable width on phone
      const targetWidth = Math.min(containerWidth < 640 ? containerWidth - 16 : containerWidth - 96, 760)
      // Allocate height: clear space for top header (55px) + bottom capsule dock (75px) + breathing margin = 150px
      const targetHeight = Math.max(300, (window.innerHeight || containerHeight || 800) - 150)
      const zoomToUse = typeof customZoom === 'number' ? customZoom : zoomLevelRef.current

      // Pass zoomToUse to renderPageToCanvas so high-DPI backing store renders crisp vector graphics without blur
      const renderResult = await renderPageToCanvas(
        pdfDoc,
        currentPage,
        canvasRef.current,
        targetWidth,
        zoomToUse,
        targetHeight
      )

      if (!renderResult) return

      setPageSize({
        width: renderResult.pageWidth,
        height: renderResult.pageHeight,
        scale: renderResult.scale,
      })

      // Fetch text content for selection layer
      const textData = await getPageTextContent(pdfDoc, currentPage, renderResult.viewport)
      setTextContent(textData)

      // Cache current page at 0.95 high quality
      const currentCached = {
        pageNumber: currentPage,
        dataUrl: canvasRef.current.toDataURL('image/webp', 0.95),
        width: renderResult.pageWidth,
        height: renderResult.pageHeight,
        scale: renderResult.scale,
        viewport: renderResult.viewport,
        textContent: textData,
      }
      setPageCache((prev) => ({ ...prev, [currentPage]: currentCached }))

      // Pre-render Next Page (N + 1) in background
      if (currentPage < totalPages && !pageCache[currentPage + 1]) {
        renderPageToCache(pdfDoc, currentPage + 1, targetWidth, targetHeight).then((nextData) => {
          setPageCache((prev) => ({ ...prev, [currentPage + 1]: nextData }))
        }).catch((e) => console.warn('Pre-render next page error:', e))
      }

      // Pre-render Previous Page (N - 1) in background
      if (currentPage > 1 && !pageCache[currentPage - 1]) {
        renderPageToCache(pdfDoc, currentPage - 1, targetWidth, targetHeight).then((prevData) => {
          setPageCache((prev) => ({ ...prev, [currentPage - 1]: prevData }))
        }).catch((e) => console.warn('Pre-render prev page error:', e))
      }
    } catch (err) {
      console.warn('Page render warning:', err)
    }
  }, [pdfDoc, currentPage, totalPages, pageCache])

  useEffect(() => {
    renderCurrentPage(zoomLevel)
  }, [renderCurrentPage, currentPage])

  // Re-render PDF vector canvas at crisp high-resolution backing store whenever zoom level settles
  useEffect(() => {
    const timer = setTimeout(() => {
      renderCurrentPage(zoomLevel)
    }, 180)
    return () => clearTimeout(timer)
  }, [zoomLevel, renderCurrentPage])

  // Suppress iOS Safari native whole-page gesture zooming so only the book page zooms
  useEffect(() => {
    const preventGesture = (e) => e.preventDefault()
    document.addEventListener('gesturestart', preventGesture, { passive: false })
    document.addEventListener('gesturechange', preventGesture, { passive: false })
    document.addEventListener('gestureend', preventGesture, { passive: false })

    return () => {
      document.removeEventListener('gesturestart', preventGesture)
      document.removeEventListener('gesturechange', preventGesture)
      document.removeEventListener('gestureend', preventGesture)
    }
  }, [])

  // Handle Window Resize, Viewport Tracking, and Hide Scrollbars
  useEffect(() => {
    let timeoutId
    const updateDimensions = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        renderCurrentPage(zoomLevel)
        setViewportSize({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      }, 100)
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    window.visualViewport?.addEventListener('resize', updateDimensions)
    const dppx = window.devicePixelRatio || 1
    const mediaQuery = window.matchMedia(`(resolution: ${dppx}dppx)`)
    mediaQuery.addEventListener?.('change', updateDimensions)

    // Remove scrollbars from body while reader is mounted
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateDimensions)
      window.visualViewport?.removeEventListener('resize', updateDimensions)
      mediaQuery.removeEventListener?.('change', updateDimensions)
      document.body.style.overflow = originalOverflow
    }
  }, [renderCurrentPage, zoomLevel])

  // Panning is ONLY permitted when zoomed in AND the page is trespassing the viewport
  const vWidth = viewportSize.width || (typeof window !== 'undefined' ? window.innerWidth : 390)
  const vHeight = viewportSize.height || (typeof window !== 'undefined' ? window.innerHeight : 800)
  const visibleReadingHeight = Math.max(300, vHeight - 140) // Reserved space for top bar and floating capsule dock

  const scaledWidth = pageSize.width * zoomLevel
  const scaledHeight = pageSize.height * zoomLevel

  // Maximum allowed pan offset from center (trespassing margins)
  const maxPanX = scaledWidth > vWidth ? (scaledWidth - vWidth) / 2 : 0
  const maxPanY = scaledHeight > visibleReadingHeight ? (scaledHeight - visibleReadingHeight) / 2 : 0
  const canPan = zoomLevel > 1.0 && (maxPanX > 0 || maxPanY > 0)

  const canPanRef = useRef(canPan)
  canPanRef.current = canPan

  const maxPanXRef = useRef(maxPanX)
  maxPanXRef.current = maxPanX

  const maxPanYRef = useRef(maxPanY)
  maxPanYRef.current = maxPanY

  // Clamp or reset pan when zoom level or boundaries change
  useEffect(() => {
    if (!canPan) {
      setPan({ x: 0, y: 0 })
    } else {
      setPan((prev) => ({
        x: maxPanX > 0 ? Math.max(-maxPanX, Math.min(maxPanX, prev.x)) : 0,
        y: maxPanY > 0 ? Math.max(-maxPanY, Math.min(maxPanY, prev.y)) : 0,
      }))
    }
  }, [canPan, maxPanX, maxPanY, zoomLevel])

  // Strictly 2-Finger Pan on Touch Devices (iPhone & Mobile Safari)
  useEffect(() => {
    let lastMidX = 0
    let lastMidY = 0
    let isTrackingTwoFingers = false

    const handleTouchStart = (e) => {
      // Intercept when 2 fingers touch down
      if (e.touches.length === 2 && canPanRef.current) {
        e.preventDefault()
        e.stopPropagation()

        isTrackingTwoFingers = true
        setIsPanning(true)

        const t1 = e.touches[0]
        const t2 = e.touches[1]
        lastMidX = (t1.clientX + t2.clientX) / 2
        lastMidY = (t1.clientY + t2.clientY) / 2
      }
    }

    const handleTouchMove = (e) => {
      // STRICTLY require exactly 2 fingers — 1 finger will NEVER pan
      if (e.touches.length === 2) {
        if (!canPanRef.current) return

        e.preventDefault()
        e.stopPropagation()

        const t1 = e.touches[0]
        const t2 = e.touches[1]
        const midX = (t1.clientX + t2.clientX) / 2
        const midY = (t1.clientY + t2.clientY) / 2

        if (!isTrackingTwoFingers) {
          // Started tracking on first 2-finger move (in case one finger landed slightly earlier)
          isTrackingTwoFingers = true
          setIsPanning(true)
          lastMidX = midX
          lastMidY = midY
          return
        }

        const dx = midX - lastMidX
        const dy = midY - lastMidY
        lastMidX = midX
        lastMidY = midY

        setPan((prev) => {
          const mX = maxPanXRef.current
          const mY = maxPanYRef.current
          return {
            x: mX > 0 ? Math.max(-mX, Math.min(mX, prev.x + dx)) : 0,
            y: mY > 0 ? Math.max(-mY, Math.min(mY, prev.y + dy)) : 0,
          }
        })
      } else {
        if (isTrackingTwoFingers) {
          isTrackingTwoFingers = false
          setIsPanning(false)
        }
      }
    }

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        isTrackingTwoFingers = false
        setIsPanning(false)
      }
    }

    // Attach to window with capture: true so we intercept 2-finger gestures reliably on iPhone
    window.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true })
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false, capture: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart, { capture: true })
      window.removeEventListener('touchmove', handleTouchMove, { capture: true })
      window.removeEventListener('touchend', handleTouchEnd, { capture: true })
      window.removeEventListener('touchcancel', handleTouchEnd, { capture: true })
    }
  }, [])

  // Trackpad / Wheel 2-finger Pan Gesture (Laptop / Desktop)
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        // Suppress any trackpad pinch zoom
        e.preventDefault()
        return
      }

      // Trackpad 2-finger scroll pan (strictly only when trespassing viewport)
      if (!canPanRef.current) return
      e.preventDefault()
      setPan((prev) => ({
        x: maxPanXRef.current > 0 ? Math.max(-maxPanXRef.current, Math.min(maxPanXRef.current, prev.x - e.deltaX)) : 0,
        y: maxPanYRef.current > 0 ? Math.max(-maxPanYRef.current, Math.min(maxPanYRef.current, prev.y - e.deltaY)) : 0,
      }))
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  // 3. Load Annotations for Current Page
  useEffect(() => {
    let isMounted = true

    async function loadPageAnnotations() {
      if (!bookId) return
      try {
        const [savedHighlights, savedDrawing, bookmarked, allBookmarks] = await Promise.all([
          getHighlightsForPage(bookId, currentPage),
          getDrawingForPage(bookId, currentPage),
          isPageBookmarked(bookId, currentPage),
          getBookmarksForBook(bookId),
        ])

        if (!isMounted) return
        setHighlights(savedHighlights)
        const strokes = savedDrawing?.strokes || []
        setDrawingStrokes(strokes)
        setDrawingHistory([strokes])
        setDrawingRedoStack([])
        setIsBookmarked(bookmarked)
        setBookmarks(allBookmarks)

        // Persist reading position
        await updateReadingProgress(bookId, currentPage)
      } catch (err) {
        console.warn('Failed to load annotations:', err)
      }
    }

    loadPageAnnotations()
    return () => {
      isMounted = false
    }
  }, [bookId, currentPage])

  // 4. Page Navigation & Zoom Handlers
  const handleNextPage = () => {
    if (pageTurnRef.current?.isFlipping) return
    setPan({ x: 0, y: 0 })
    if (pageTurnRef.current?.turnNext) {
      pageTurnRef.current.turnNext()
    } else if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  const handlePrevPage = () => {
    if (pageTurnRef.current?.isFlipping) return
    setPan({ x: 0, y: 0 })
    if (pageTurnRef.current?.turnPrev) {
      pageTurnRef.current.turnPrev()
    } else if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }

  const handleJumpToPage = (targetPage) => {
    if (targetPage >= 1 && targetPage <= totalPages) {
      setPan({ x: 0, y: 0 })
      setCurrentPage(targetPage)
    }
  }

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.5, +(prev + 0.25).toFixed(2)))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(1.0, +(prev - 0.25).toFixed(2))
      if (next <= 1.0) setPan({ x: 0, y: 0 })
      return next
    })
  }

  const handleResetZoom = () => {
    setZoomLevel(1.0)
    setPan({ x: 0, y: 0 })
  }

  // 5. Highlighting Handlers
  const handleAddHighlight = async (hlData) => {
    try {
      const newHl = await saveHighlight({
        bookId,
        pageNumber: currentPage,
        color: hlData.color,
        borderColor: hlData.borderColor,
        text: hlData.text,
        rectsArray: hlData.rectsArray,
      })
      setHighlights((prev) => [...prev, newHl])
      return newHl
    } catch (err) {
      console.warn('Failed to save highlight:', err)
      return null
    }
  }

  const handleUpdateHighlight = async (updatedHl) => {
    try {
      await saveHighlight(updatedHl)
      setHighlights((prev) => prev.map((h) => (h.id === updatedHl.id ? updatedHl : h)))
    } catch (err) {
      console.warn('Failed to update highlight:', err)
    }
  }

  const handleDeleteHighlight = async (hlId) => {
    try {
      await deleteHighlight(hlId)
      setHighlights((prev) => prev.filter((h) => h.id !== hlId))
    } catch (err) {
      console.warn('Failed to delete highlight:', err)
    }
  }

  // 6. Drawing & Stroke Handlers
  const handleSaveStrokes = async (newStrokes) => {
    setDrawingStrokes(newStrokes)
    setDrawingHistory((prev) => [...prev, newStrokes])
    setDrawingRedoStack([]) // Clear redo stack on new stroke

    try {
      await saveDrawing({
        bookId,
        pageNumber: currentPage,
        strokes: newStrokes,
      })
    } catch (err) {
      console.warn('Failed to persist drawing strokes:', err)
    }
  }

  const handleUndoDraw = async () => {
    if (drawingHistory.length <= 1) return
    const newHistory = [...drawingHistory]
    const popped = newHistory.pop()
    const previousState = newHistory[newHistory.length - 1] || []

    setDrawingHistory(newHistory)
    setDrawingRedoStack((prev) => [popped, ...prev])
    setDrawingStrokes(previousState)

    await saveDrawing({
      bookId,
      pageNumber: currentPage,
      strokes: previousState,
    })
  }

  const handleRedoDraw = async () => {
    if (drawingRedoStack.length === 0) return
    const [nextState, ...rest] = drawingRedoStack
    setDrawingRedoStack(rest)
    setDrawingHistory((prev) => [...prev, nextState])
    setDrawingStrokes(nextState)

    await saveDrawing({
      bookId,
      pageNumber: currentPage,
      strokes: nextState,
    })
  }

  // 7. Bookmark Toggle & Delete Handlers
  const handleToggleBookmark = async () => {
    try {
      const isNowBookmarked = await toggleBookmark(bookId, currentPage)
      setIsBookmarked(isNowBookmarked)
      const updatedBookmarks = await getBookmarksForBook(bookId)
      setBookmarks(updatedBookmarks)
    } catch (err) {
      console.warn('Failed to toggle bookmark:', err)
    }
  }

  const handleDeleteBookmark = async (bookmarkId) => {
    try {
      await deleteBookmark(bookmarkId)
      const updatedBookmarks = await getBookmarksForBook(bookId)
      setBookmarks(updatedBookmarks)
      const bookmarked = await isPageBookmarked(bookId, currentPage)
      setIsBookmarked(bookmarked)
    } catch (err) {
      console.warn('Failed to delete bookmark:', err)
    }
  }

  // 8. Tap on Page to Toggle Controls
  const handlePageTap = () => {
    if (!isDrawMode) {
      setControlsVisible((prev) => !prev)
    }
  }

  // Error State Render
  if (errorMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
        <div className="max-w-md rounded-2xl bg-surface-white p-8 shadow-soft border border-black/8">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-3" />
          <h2 className="font-sans text-lg font-bold text-text-primary mb-2">Unable to Open Book</h2>
          <p className="font-sans text-xs text-text-muted mb-6 leading-relaxed">{errorMessage}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-pill bg-surface-dark px-6 py-2.5 text-xs font-sans font-semibold text-white hover:bg-black transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    )
  }

  // Loading State Render
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas">
        <Loader2 className="h-8 w-8 animate-spin text-text-muted mb-3" />
        <p className="font-sans text-xs tracking-wider uppercase text-text-muted">Opening your book...</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen w-full flex-col items-center justify-center bg-canvas overflow-hidden py-2 px-2 sm:px-6 select-none no-scrollbar"
    >
      {/* Reader Navigation & Context Controls */}
      <ReaderControls
        bookTitle={book?.title || 'Book Reader'}
        currentPage={currentPage}
        totalPages={totalPages}
        isBookmarked={isBookmarked}
        isDrawMode={isDrawMode}
        drawTool={drawTool}
        drawColor={drawColor}
        drawWidth={drawWidth}
        canUndoDraw={drawingHistory.length > 1}
        canRedoDraw={drawingRedoStack.length > 0}
        bookmarks={bookmarks}
        activeHighlightColor={activeHighlightColor}
        highlightColors={HIGHLIGHT_COLORS}
        zoomLevel={zoomLevel}
        isVisible={controlsVisible}
        onToggleBookmark={handleToggleBookmark}
        onDeleteBookmark={handleDeleteBookmark}
        onToggleDrawMode={() => setIsDrawMode((prev) => !prev)}
        onSelectHighlightColor={setActiveHighlightColor}
        onSetDrawTool={setDrawTool}
        onSetDrawColor={setDrawColor}
        onSetDrawWidth={setDrawWidth}
        onUndoDraw={handleUndoDraw}
        onRedoDraw={handleRedoDraw}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onJumpToPage={handleJumpToPage}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
      />

      {/* Centered Spread with Outside Arrow Buttons */}
      <div className="relative flex items-center justify-center gap-3 sm:gap-6 lg:gap-8 w-full max-w-6xl">
        {/* Outside Previous Page Button (Laptop / Desktop) */}
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-white text-text-primary shadow-soft border border-black/8 hover:bg-surface-cream hover:scale-110 active:scale-95 transition-all disabled:opacity-15 disabled:pointer-events-none cursor-pointer z-30"
          title="Previous page (Left Arrow)"
        >
          <ChevronLeft size={22} />
        </button>

        {/* 3D Perspective Warp Page Container Wrapped in Zoom & Pan Viewport */}
        <div
          className="relative origin-center"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoomLevel})`,
            transition: isPanning ? 'none' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)',
            willChange: 'transform',
          }}
        >
          <PageTurnContainer
          ref={pageTurnRef}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          nextPageData={pageCache[currentPage + 1]}
          prevPageData={pageCache[currentPage - 1]}
          isDrawing={isDrawMode}
          onNextPage={() => {
            if (currentPage < totalPages) {
              setCurrentPage((prev) => prev + 1)
            }
          }}
          onPrevPage={() => {
            if (currentPage > 1) {
              setCurrentPage((prev) => prev - 1)
            }
          }}
        >
          {/* Physical Paper Page Surface */}
          <div
            onClick={handlePageTap}
            className="relative rounded-md bg-surface-white overflow-hidden transition-shadow"
            style={{
              width: pageSize.width ? `${pageSize.width}px` : 'auto',
              height: pageSize.height ? `${pageSize.height}px` : 'auto',
            }}
          >
            {/* Layer 1: PDF Rendered Canvas */}
            <canvas ref={canvasRef} className="block w-full h-full" />

            {/* Layer 2: Highlight Layer & Text Selection */}
            {pageSize.width > 0 && (
              <HighlightLayer
                width={pageSize.width}
                height={pageSize.height}
                highlights={highlights}
                textContent={textContent}
                scale={pageSize.scale}
                isActive={!isDrawMode}
                activeColor={activeHighlightColor}
                onAddHighlight={handleAddHighlight}
                onUpdateHighlight={handleUpdateHighlight}
                onDeleteHighlight={handleDeleteHighlight}
              />
            )}

            {/* Layer 3: Drawing & Doodling Canvas */}
            {pageSize.width > 0 && (
              <DrawingCanvas
                width={pageSize.width}
                height={pageSize.height}
                strokes={drawingStrokes}
                activeTool={drawTool}
                color={drawColor}
                lineWidth={drawWidth}
                isActive={isDrawMode}
                onSaveStrokes={handleSaveStrokes}
              />
            )}
          </div>
          </PageTurnContainer>
        </div>

        {/* Outside Next Page Button (Laptop / Desktop) */}
        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-white text-text-primary shadow-soft border border-black/8 hover:bg-surface-cream hover:scale-110 active:scale-95 transition-all disabled:opacity-15 disabled:pointer-events-none cursor-pointer z-30"
          title="Next page (Right Arrow)"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  )
}
