import type { ShapeRenderData } from '../evolution/shape'
import { polygonLocalVertices } from './shapeGeometry'

export function renderShape(shape: ShapeRenderData, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
  ctx.save()
  ctx.globalAlpha = shape.alpha
  ctx.fillStyle = `rgb(${shape.color.r},${shape.color.g},${shape.color.b})`
  ctx.translate(shape.x, shape.y)
  ctx.rotate(shape.rotation)

  if (shape.mode === 'polygon') {
    renderPolygon(shape, ctx)
  } else {
    switch (shape.type) {
      case 'circle':
        ctx.beginPath()
        ctx.arc(0, 0, Math.min(shape.width, shape.height) / 2, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'rectangle':
        ctx.fillRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height)
        break
      case 'triangle':
        ctx.beginPath()
        ctx.moveTo(0, -shape.height / 2)
        ctx.lineTo(-shape.width / 2, shape.height / 2)
        ctx.lineTo(shape.width / 2, shape.height / 2)
        ctx.closePath()
        ctx.fill()
        break
    }
  }

  ctx.restore()
}

function renderPolygon(shape: ShapeRenderData, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
  const vertices = polygonLocalVertices(shape)
  ctx.beginPath()
  for (let i = 0; i < vertices.length; i += 2) {
    const x = vertices[i]!
    const y = vertices[i + 1]!
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

export function renderCanvasBackground(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  backgroundColor: string
): void {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.restore()
}

/**
 * Renders an individual (collection of shapes) to a canvas context.
 * 
 * @param individual - The individual to render, containing an array of shapes
 * @param ctx - The 2D canvas rendering context where the individual will be drawn
 */
export function renderIndividual(
  individual: Individual,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  backgroundColor: string
): void {
  renderCanvasBackground(ctx, backgroundColor)
  // Sort shapes by z-index (back to front)
  const sortedShapes = [...individual.shapes].sort((a, b) => a.z - b.z)
  for (const shape of sortedShapes) {
    renderShape(shape, ctx)
  }
}