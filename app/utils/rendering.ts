/**
 * Renders an individual (collection of shapes) to a canvas context.
 * 
 * This function takes an individual from the genetic algorithm population and renders
 * all its shapes to the provided canvas context.
 * 
 * @param individual - The individual to render, containing an array of shapes
 * @param ctx - The 2D canvas rendering context where the individual will be drawn
 */
export function renderIndividual(individual: Individual, ctx: CanvasRenderingContext2D): void {
  // Sort shapes by z-index (back to front)
  const sortedShapes = [...individual.shapes].sort((a, b) => a.z - b.z)
  for (const shape of sortedShapes) {
    shape.render(ctx)
  }
}