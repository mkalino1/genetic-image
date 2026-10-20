import type { ShapeRenderData } from './shape'

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
  const sides = shape.numSides
  const baseRadius = Math.min(shape.width, shape.height) / 2
  ctx.beginPath()
  for (let i = 0; i < sides; i++) {
    const baseAngle = (i / sides) * Math.PI * 2 - Math.PI / 2
    const angleOffset = shape.vertexAngleOffsets?.[i] || 0
    const radiusMultiplier = shape.vertexRadiusMults?.[i] || 1
    const angle = baseAngle + angleOffset
    const radius = baseRadius * radiusMultiplier
    const x = radius * Math.cos(angle)
    const y = radius * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

/**
 * Renders an individual (collection of shapes) to a canvas context.
 * 
 * @param individual - The individual to render, containing an array of shapes
 * @param ctx - The 2D canvas rendering context where the individual will be drawn
 */
export function renderIndividual(individual: Individual, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
  // Clears the canvas to ensure a fresh rendering
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  // Sort shapes by z-index (back to front)
  const sortedShapes = [...individual.shapes].sort((a, b) => a.z - b.z)
  for (const shape of sortedShapes) {
    renderShape(shape, ctx)
  }
}