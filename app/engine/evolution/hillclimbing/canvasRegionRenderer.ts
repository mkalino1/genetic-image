import { renderShape } from '../../image/shapeRendering'
import type { Region } from '../../image/shapeGeometry'
import type { ShapeRenderData } from '../shape'

export class CanvasRegionRenderer {
  private readonly ctx: OffscreenCanvasRenderingContext2D

  constructor(width: number, height: number, private readonly background: string) {
    const ctx = new OffscreenCanvas(width, height)
      .getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Could not create hill climbing canvas')
    this.ctx = ctx
  }

  render(shapes: readonly ShapeRenderData[], region: Region): Uint8ClampedArray {
    const ctx = this.ctx
    ctx.fillStyle = this.background
    ctx.fillRect(region.x, region.y, region.width, region.height)
    for (const shape of shapes) renderShape(shape, ctx)
    return ctx.getImageData(region.x, region.y, region.width, region.height).data
  }
}
