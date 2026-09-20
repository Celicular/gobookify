import { useRef, useEffect, useCallback } from 'react'

export default function DrawingCanvas({
  width,
  height,
  strokes = [],
  activeTool = 'pen', // 'pen' | 'eraser'
  color = '#111113',
  lineWidth = 3,
  isActive = false,
  onSaveStrokes,
}) {
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef([])
  // Redraw all strokes on canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)

    strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length < 2) return

      ctx.beginPath()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = stroke.width * 3
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = stroke.color
        ctx.lineWidth = stroke.width
      }

      const p0 = stroke.points[0]
      ctx.moveTo(p0.x * width, p0.y * height)

      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i]
        ctx.lineTo(p.x * width, p.y * height)
      }
      ctx.stroke()
    })

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over'
  }, [strokes, width, height])

  useEffect(() => {
    redraw()
  }, [redraw])

  // Pointer event handlers
  const handlePointerDown = (e) => {
    if (!isActive) return
    // Ignore secondary pointers (multi-touch) and abort ongoing stroke so 2-finger pan doesn't draw
    if (e.isPrimary === false) {
      if (isDrawingRef.current) {
        isDrawingRef.current = false
        currentStrokeRef.current = []
        redraw()
      }
      return
    }
    e.preventDefault()
    e.stopPropagation()

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    isDrawingRef.current = true
    currentStrokeRef.current = [{ x, y }]

    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = lineWidth * 3
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
    }

    ctx.moveTo(x * width, y * height)
  }

  const handlePointerMove = (e) => {
    if (!isActive || !isDrawingRef.current || e.isPrimary === false) return
    e.preventDefault()
    e.stopPropagation()

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    currentStrokeRef.current.push({ x, y })

    const ctx = canvas.getContext('2d')
    ctx.lineTo(x * width, y * height)
    ctx.stroke()
  }

  const handlePointerUp = (e) => {
    if (!isActive || !isDrawingRef.current) return
    e.preventDefault()
    e.stopPropagation()

    isDrawingRef.current = false
    const pts = currentStrokeRef.current

    if (pts.length > 1) {
      const newStroke = {
        points: pts,
        color,
        width: lineWidth,
        isEraser: activeTool === 'eraser',
      }
      const updated = [...strokes, newStroke]
      onSaveStrokes?.(updated)
    }
    currentStrokeRef.current = []
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute inset-0 z-20 ${
        isActive ? 'pointer-events-auto touch-none cursor-crosshair' : 'pointer-events-none'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  )
}
