import { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { HIGHLIGHT_COLORS } from '../../constants/highlights'

// Normalizes highlight colors (including legacy saved ones) to a soft 16% opacity
// This ensures underlying PDF text remains at least 84-85% visible and crisp
function normalizeHighlightBg(colorStr) {
  if (!colorStr) return 'rgba(250, 204, 21, 0.16)'
  return colorStr.replace(
    /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/g,
    'rgba($1, $2, $3, 0.16)'
  )
}

export default function HighlightLayer({
  width,
  height,
  highlights = [],
  textContent = null,
  scale = 1.0,
  isActive = true,
  activeColor = HIGHLIGHT_COLORS[0],
  onAddHighlight,
  onUpdateHighlight,
  onDeleteHighlight,
}) {
  const containerRef = useRef(null)
  const [activeHighlight, setActiveHighlight] = useState(null) // highlight being edited/inspected

  // Handle direct highlighting immediately upon text selection
  const handleSelectionEnd = () => {
    if (!isActive) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return

    const range = sel.getRangeAt(0)
    const container = containerRef.current
    if (!container || !container.contains(range.commonAncestorContainer)) return

    const containerRect = container.getBoundingClientRect()
    const clientRects = Array.from(range.getClientRects())

    if (clientRects.length === 0) return

    // Convert each client rect to normalized coordinates (0.0 to 1.0)
    // Using containerRect dimensions ensures precise coordinates under any zoom scale
    const normalizedRects = clientRects.map((r) => ({
      x: (r.left - containerRect.left) / containerRect.width,
      y: (r.top - containerRect.top) / containerRect.height,
      width: r.width / containerRect.width,
      height: r.height / containerRect.height,
    }))

    const selectedText = sel.toString().trim()
    if (!selectedText) return

    // Immediately create and persist highlight — no toolbar shown
    const newHighlight = {
      color: activeColor.bg,
      borderColor: activeColor.border,
      text: selectedText,
      rectsArray: normalizedRects,
    }

    onAddHighlight?.(newHighlight)

    // Clear native browser blue selection
    sel.removeAllRanges()
  }

  // Change color of active highlight
  const handleColorChange = (colorObj) => {
    if (!activeHighlight) return
    const updated = {
      ...activeHighlight,
      color: colorObj.bg,
      borderColor: colorObj.border,
    }
    setActiveHighlight(updated)
    onUpdateHighlight?.(updated)
  }

  // Dismiss toolbar on outside click
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setActiveHighlight(null)
      }
    }
    document.addEventListener('pointerdown', handleDocumentClick)
    return () => document.removeEventListener('pointerdown', handleDocumentClick)
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-15 pointer-events-auto select-text overflow-hidden"
      style={{ width: `${width}px`, height: `${height}px` }}
      onMouseUp={handleSelectionEnd}
      onTouchEnd={handleSelectionEnd}
    >
      {/* 1. Rendered Highlights */}
      {highlights.map((hl) => {
        const rects = hl.rectsArray || (hl.rects ? [hl.rects] : [])
        const isSelected = activeHighlight?.id === hl.id

        return (
          <div key={hl.id} className="relative">
            {rects.map((r, i) => (
              <div
                key={i}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveHighlight(isSelected ? null : hl)
                }}
                className={`absolute cursor-pointer rounded-xs transition-opacity hover:opacity-95 mix-blend-multiply ${
                  isSelected ? 'ring-2 ring-black/30 shadow-xs' : ''
                }`}
                style={{
                  left: `${r.x * width}px`,
                  top: `${r.y * height}px`,
                  width: `${r.width * width}px`,
                  height: `${r.height * height}px`,
                  backgroundColor: normalizeHighlightBg(hl.color),
                }}
              />
            ))}
          </div>
        )
      })}

      {/* 2. Compact Contextual Toolbar (Recolor or Delete) */}
      {activeHighlight && activeHighlight.rectsArray?.[0] && (
        <div
          className="absolute z-30 flex items-center gap-2 rounded-pill bg-surface-dark px-3 py-1.5 shadow-float border border-white/15 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${Math.max(10, Math.min(width - 180, activeHighlight.rectsArray[0].x * width))}px`,
            top: `${Math.max(10, activeHighlight.rectsArray[0].y * height - 42)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Color Switchers */}
          <div className="flex items-center gap-1.5 border-r border-white/20 pr-2">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                onClick={() => handleColorChange(c)}
                className="h-4.5 w-4.5 rounded-full border border-white/30 transition-transform hover:scale-125 focus:outline-none"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>

          {/* Delete Action */}
          <button
            type="button"
            onClick={() => {
              onDeleteHighlight?.(activeHighlight.id)
              setActiveHighlight(null)
            }}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-sans"
            title="Delete highlight"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* 3. Invisible Native Text Layer (For Selection Only) */}
      {textContent && textContent.textContent && (
        <div className="pdf-text-layer select-text">
          {textContent.textContent.items.map((item, index) => {
            const tx = item.transform
            const vp = textContent.viewport

            // Exact viewport mapping
            const point = vp
              ? vp.convertToViewportPoint(tx[4], tx[5])
              : [tx[4] * scale, height - tx[5] * scale]

            const fontSize = Math.hypot(tx[0], tx[1]) * (vp ? vp.scale : scale)
            const left = Math.round(point[0])
            const top = Math.round(point[1] - fontSize)
            const spanWidth = Math.round((item.width || 0) * (vp ? vp.scale : scale))

            return (
              <span
                key={index}
                style={{
                  position: 'absolute',
                  left: `${left}px`,
                  top: `${top}px`,
                  fontSize: `${fontSize}px`,
                  fontFamily: 'sans-serif',
                  whiteSpace: 'pre',
                  color: 'transparent',
                  width: spanWidth > 0 ? `${spanWidth}px` : 'auto',
                  height: `${fontSize}px`,
                  lineHeight: 1,
                  cursor: 'text',
                }}
              >
                {item.str}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
