import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  PenTool,
  Eraser,
  Undo2,
  Redo2,
  ListOrdered,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react'

const DRAWING_COLORS = [
  { id: 'ink', hex: '#111113', label: 'Ink Black' },
  { id: 'lavender', hex: '#7C3AED', label: 'Lavender' },
  { id: 'amber', hex: '#D97706', label: 'Amber Gold' },
  { id: 'blue', hex: '#2563EB', label: 'Cobalt Blue' },
  { id: 'red', hex: '#DC2626', label: 'Crimson Red' },
]

export default function ReaderControls({
  bookTitle,
  currentPage,
  totalPages,
  isBookmarked,
  isDrawMode,
  drawTool, // 'pen' | 'eraser'
  drawColor,
  drawWidth,
  canUndoDraw,
  canRedoDraw,
  bookmarks = [],
  activeHighlightColor,
  highlightColors = [],
  zoomLevel = 1.0,
  isVisible = true,
  onToggleBookmark,
  onToggleDrawMode,
  onSelectHighlightColor,
  onSetDrawTool,
  onSetDrawColor,
  onSetDrawWidth,
  onUndoDraw,
  onRedoDraw,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onJumpToPage,
  onNextPage,
  onPrevPage,
}) {
  const [showBookmarksModal, setShowBookmarksModal] = useState(false)
  const [showHighlightMenu, setShowHighlightMenu] = useState(false)

  return (
    <>
      {/* 1. Top Bar (Tap-to-reveal) */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 sm:px-8 transition-transform duration-300 ease-out ${
          isVisible ? 'translate-y-0 pointer-events-auto' : '-translate-y-full pointer-events-none'
        }`}
      >
        {/* Back to Library */}
        <Link
          to="/"
          className="flex items-center gap-2 rounded-pill bg-surface-white/95 px-3.5 py-2 text-xs font-sans font-semibold text-text-primary shadow-soft border border-black/8 hover:bg-surface-cream transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Library</span>
        </Link>

        {/* Book Title */}
        <div className="max-w-[200px] sm:max-w-[320px] truncate text-center font-sans text-xs font-medium tracking-wider uppercase text-text-secondary">
          {bookTitle}
        </div>

        {/* Bookmark Action */}
        <button
          type="button"
          onClick={onToggleBookmark}
          className={`flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-xs font-sans font-medium transition-all shadow-soft border ${
            isBookmarked
              ? 'bg-honey-surface text-honey-text border-honey-border font-semibold'
              : 'bg-surface-white/95 text-text-muted border-black/8 hover:text-text-primary'
          }`}
        >
          {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          <span className="hidden sm:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
        </button>
      </div>

      {/* 2. Floating Bottom Capsule Dock (Editorial Modernism - Always Overlaid & Invariant) */}
      <div
        className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-16px)] transition-transform duration-300 ease-out ${
          isVisible ? 'translate-y-0 pointer-events-auto' : 'translate-y-24 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-pill bg-surface-dark px-2 sm:px-3 py-1.5 sm:py-2 shadow-float border border-white/10 text-text-inverse whitespace-nowrap">
          {/* Page Navigation Group */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              onClick={onPrevPage}
              disabled={currentPage <= 1}
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-text-subtle hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:pointer-events-none"
              title="Previous page"
            >
              <ChevronLeft size={15} />
            </button>

            {/* Page Counter */}
            <div className="px-0.5 font-mono text-[10px] sm:text-xs tracking-wider text-text-subtle select-none whitespace-nowrap">
              <span className="text-white font-semibold">{currentPage}</span>
              <span className="opacity-60">/{totalPages}</span>
            </div>

            <button
              type="button"
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-text-subtle hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:pointer-events-none"
              title="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="h-3.5 w-px bg-white/15 mx-0.5 shrink-0" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              onClick={onUndoDraw}
              disabled={!canUndoDraw}
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-text-subtle hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:pointer-events-none"
              title="Undo"
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              onClick={onRedoDraw}
              disabled={!canRedoDraw}
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-text-subtle hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:pointer-events-none"
              title="Redo"
            >
              <Redo2 size={13} />
            </button>
          </div>

          <div className="h-3.5 w-px bg-white/15 mx-0.5 shrink-0" />

          {/* Zoom Controls (Buttons Only) */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              onClick={onZoomOut}
              disabled={zoomLevel <= 1.0}
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-text-subtle hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:pointer-events-none"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              onClick={onResetZoom}
              title="Click to reset zoom"
              className="px-0.5 font-mono text-[10px] sm:text-xs text-text-subtle hover:text-white transition-colors select-none whitespace-nowrap"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              onClick={onZoomIn}
              disabled={zoomLevel >= 2.5}
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-text-subtle hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:pointer-events-none"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <div className="h-3.5 w-px bg-white/15 mx-0.5 shrink-0" />

          {/* Highlight Color Selector */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowHighlightMenu((prev) => !prev)}
              className="flex h-6 w-6 sm:h-7 sm:w-auto items-center justify-center gap-1.5 rounded-pill sm:px-2.5 py-1 text-xs font-sans font-medium text-text-subtle hover:text-white hover:bg-white/10 transition-colors"
              title="Change active highlight color"
            >
              <span
                className="h-3 w-3 rounded-full border border-white/40 shadow-xs shrink-0"
                style={{ backgroundColor: activeHighlightColor?.hex || '#FEF08A' }}
              />
              <span className="hidden sm:inline">Highlight</span>
            </button>

            {showHighlightMenu && (
              <div
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-pill bg-surface-dark px-3 py-2 shadow-float border border-white/15 animate-in fade-in zoom-in-95 duration-150 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {highlightColors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      onSelectHighlightColor?.(c)
                      setShowHighlightMenu(false)
                    }}
                    className={`h-5 w-5 rounded-full border transition-transform ${
                      activeHighlightColor?.id === c.id
                        ? 'scale-125 border-white ring-2 ring-white/40'
                        : 'border-white/30 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Draw Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDrawMode}
            className={`flex h-6 w-6 sm:h-7 sm:w-auto items-center justify-center gap-1.5 rounded-pill sm:px-2.5 py-1 text-xs font-sans font-medium transition-colors shrink-0 ${
              isDrawMode
                ? 'bg-honey-surface text-honey-text font-semibold'
                : 'text-text-subtle hover:text-white hover:bg-white/10'
            }`}
            title="Doodle"
          >
            <PenTool size={13} />
            <span className="hidden sm:inline">{isDrawMode ? 'Done' : 'Doodle'}</span>
          </button>

          {/* Bookmarks Quick Jump */}
          <button
            type="button"
            onClick={() => setShowBookmarksModal(true)}
            className="flex h-6 w-6 sm:h-7 sm:w-auto items-center justify-center gap-1.5 rounded-pill sm:px-2.5 py-1 text-xs font-sans font-medium text-text-subtle hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Bookmarks"
          >
            <ListOrdered size={13} />
            <span className="hidden sm:inline">Bookmarks</span>
          </button>
        </div>
      </div>

      {/* 3. Drawing Tools Floating Toolbar (Active during Draw Mode) */}
      {isDrawMode && (
        <div className="fixed bottom-18 sm:bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-2 sm:gap-2.5 rounded-2xl sm:rounded-pill bg-surface-white px-3 sm:px-4 py-2 sm:py-2.5 shadow-float border border-black/10 animate-in fade-in slide-in-from-bottom-3 duration-200 whitespace-nowrap max-w-[calc(100vw-20px)] overflow-x-auto no-scrollbar">
          {/* Tool: Pen vs Eraser */}
          <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-pill shrink-0">
            <button
              type="button"
              onClick={() => onSetDrawTool('pen')}
              className={`p-1.5 rounded-full transition-colors ${
                drawTool === 'pen' ? 'bg-surface-dark text-white' : 'text-text-muted hover:text-text-primary'
              }`}
              title="Pen"
            >
              <PenTool size={14} />
            </button>
            <button
              type="button"
              onClick={() => onSetDrawTool('eraser')}
              className={`p-1.5 rounded-full transition-colors ${
                drawTool === 'eraser' ? 'bg-surface-dark text-white' : 'text-text-muted hover:text-text-primary'
              }`}
              title="Eraser"
            >
              <Eraser size={14} />
            </button>
          </div>

          {/* Color Palette */}
          {drawTool === 'pen' && (
            <div className="flex items-center gap-1.5 px-1 shrink-0">
              {DRAWING_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => onSetDrawColor(c.hex)}
                  className={`h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-full border transition-transform ${
                    drawColor === c.hex ? 'scale-125 border-surface-dark ring-2 ring-black/20' : 'border-black/10'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          )}

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-surface-subtle px-1.5 sm:px-2 py-1 rounded-pill text-[11px] font-mono text-text-secondary shrink-0">
            {[2, 4, 8].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onSetDrawWidth(w)}
                className={`px-1.5 py-0.5 rounded-full transition-colors ${
                  drawWidth === w ? 'bg-surface-dark text-white font-bold' : 'hover:text-text-primary'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              onClick={onUndoDraw}
              disabled={!canUndoDraw}
              className="p-1 sm:p-1.5 rounded-full text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none"
              title="Undo"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              onClick={onRedoDraw}
              disabled={!canRedoDraw}
              className="p-1 sm:p-1.5 rounded-full text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none"
              title="Redo"
            >
              <Redo2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 4. Bookmarks List Modal */}
      {showBookmarksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-none animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl bg-surface-white p-5 shadow-float border border-black/10">
            <div className="flex items-center justify-between pb-3 border-b border-surface-subtle">
              <h3 className="font-sans font-semibold text-sm text-text-primary">Bookmarks</h3>
              <button
                type="button"
                onClick={() => setShowBookmarksModal(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto py-2">
              {bookmarks.length === 0 ? (
                <p className="py-6 text-center text-xs text-text-muted font-sans">
                  No pages bookmarked yet. Tap the bookmark icon while reading to save pages.
                </p>
              ) : (
                <div className="space-y-1">
                  {bookmarks.map((bm) => (
                    <button
                      key={bm.id}
                      type="button"
                      onClick={() => {
                        onJumpToPage(bm.pageNumber)
                        setShowBookmarksModal(false)
                      }}
                      className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-text-primary hover:bg-surface-cream transition-colors font-sans"
                    >
                      <span>Page {bm.pageNumber}</span>
                      <span className="font-mono text-[11px] text-text-subtle">
                        {new Date(bm.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
