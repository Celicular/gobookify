import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { motion, useAnimationControls } from 'framer-motion'

// Quick horizontal swipe detection — distinguishes from hold-to-highlight
const SWIPE_THRESHOLD = 45 // px
const SWIPE_MAX_TIME = 280 // ms — must be fast to count as swipe (not a hold)

const PageTurnContainer = forwardRef(function PageTurnContainer(
  {
    children,
    currentPage,
    totalPages,
    pageSize,
    nextPageData,
    prevPageData,
    isDrawing = false,
    onNextPage,
    onPrevPage,
  },
  ref
) {
  const containerRef = useRef(null)
  const controls = useAnimationControls()
  const turningRef = useRef(false)
  const [turnDir, setTurnDir] = useState(null)
  const [revealImg, setRevealImg] = useState(null) // underneath during flip
  const [coverImg, setCoverImg] = useState(null)   // on top after flip, hides canvas repaint

  const canNext = currentPage < totalPages
  const canPrev = currentPage > 1

  const animatePageTurn = useCallback(async (dir) => {
    if (turningRef.current) return
    if (dir === 'next' && !canNext) return
    if (dir === 'prev' && !canPrev) return

    turningRef.current = true

    const img = dir === 'next' ? nextPageData?.dataUrl : prevPageData?.dataUrl
    setRevealImg(img || null)
    setCoverImg(null)
    setTurnDir(dir)

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    // Animate current page warping away — reveals pre-rendered image underneath
    await controls.start({
      rotateY: dir === 'next' ? -85 : 85,
      scale: 0.96,
      transition: {
        duration: 0.38,
        ease: [0.36, 0.0, 0.66, -0.06],
      },
    })

    // Promote the pre-rendered image to a cover on TOP (z-20)
    // so canvas can re-render invisibly behind it
    setCoverImg(img || null)
    setRevealImg(null)

    // Snap canvas back to flat (invisible behind cover)
    controls.set({ rotateY: 0, scale: 1 })

    // Change page state — canvas re-renders behind the cover
    if (dir === 'next') onNextPage?.()
    else onPrevPage?.()

    // Wait for canvas to finish painting (3 frames)
    await new Promise((r) => requestAnimationFrame(() =>
      requestAnimationFrame(() => requestAnimationFrame(r))
    ))

    // Remove cover — canvas is now painted with the new page
    setCoverImg(null)
    setTurnDir(null)

    turningRef.current = false
  }, [canNext, canPrev, controls, nextPageData, prevPageData, onNextPage, onPrevPage])

  const handleNext = useCallback(() => animatePageTurn('next'), [animatePageTurn])
  const handlePrev = useCallback(() => animatePageTurn('prev'), [animatePageTurn])

  useImperativeHandle(ref, () => ({
    turnNext: handleNext,
    turnPrev: handlePrev,
    get isFlipping() { return turningRef.current },
  }), [handleNext, handlePrev])

  // ── Single-Finger Swipe (mobile) — quick horizontal swipe = page turn ──
  // Hold / slow drag is left to the browser for text selection → highlighting
  const touchRef = useRef(null)

  const handleTouchStart = (e) => {
    if (isDrawing || turningRef.current) return
    if (e.touches.length === 1) {
      touchRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startTime: Date.now(),
        triggered: false,
      }
    } else {
      touchRef.current = null
    }
  }

  const handleTouchMove = (e) => {
    if (!touchRef.current || touchRef.current.triggered || isDrawing || turningRef.current) return
    if (e.touches.length !== 1) {
      touchRef.current = null
      return
    }

    const dx = e.touches[0].clientX - touchRef.current.startX
    const dy = e.touches[0].clientY - touchRef.current.startY
    const elapsed = Date.now() - touchRef.current.startTime

    // Must be horizontal (> 2x vertical movement) and fast enough
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 2 && elapsed < SWIPE_MAX_TIME) {
      touchRef.current.triggered = true
      if (dx < 0 && canNext) handleNext()
      else if (dx > 0 && canPrev) handlePrev()
    }
  }

  const handleTouchEnd = () => {
    touchRef.current = null
  }

  // ── Keyboard Navigation ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isDrawing || turningRef.current) return
      if (e.key === 'ArrowRight') handleNext()
      else if (e.key === 'ArrowLeft') handlePrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawing, handleNext, handlePrev])

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative select-none"
      style={{
        width: pageSize.width ? `${pageSize.width}px` : 'auto',
        height: pageSize.height ? `${pageSize.height}px` : 'auto',
        perspective: '1800px',
      }}
    >
      {/* Layer 0: Destination page sitting flat underneath (static, no animation) */}
      {revealImg && (
        <div className="absolute inset-0 z-0 rounded-md bg-surface-white overflow-hidden border border-black/8 shadow-soft">
          <img
            src={revealImg}
            alt="Next page"
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
      )}

      {/* Layer 1: Current page (live canvas) — only this animates */}
      <motion.div
        animate={controls}
        className="relative z-10 w-full h-full rounded-md bg-surface-white overflow-hidden shadow-soft border border-black/8"
        style={{
          transformOrigin: turnDir === 'prev' ? 'right center' : 'left center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          willChange: 'transform',
        }}
      >
        {children}
      </motion.div>

      {/* Layer 2: Cover — sits on top after animation to hide canvas repaint */}
      {coverImg && (
        <div className="absolute inset-0 z-20 rounded-md bg-surface-white overflow-hidden border border-black/8 shadow-soft pointer-events-none">
          <img
            src={coverImg}
            alt=""
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
      )}
    </div>
  )
})

export default PageTurnContainer
