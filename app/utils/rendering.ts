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
    shape.render(ctx)
  }
}