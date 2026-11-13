import type { ShapeMode } from '../../config'
import { CANVAS_CONFIG, HILL_CLIMBING_CONFIG } from '../../config'
import type { PixelErrorFn } from '../../fitness/metrics/errorFunctionFactory'
import type { FitnessTarget } from '../../fitness/fitnessTarget'
import { fitnessFromError } from '../../fitness/fitnessScoreConversion'
import { createHighErrorCoordinateSampler } from '../samplers/highErrorCoordinateSampler'
import type { HighErrorCoordinateSampler } from '../samplers/highErrorCoordinateSampler'
import { createHighErrorOverlappingShapeSampler } from '../samplers/highErrorOverlappingShapeSampler'
import { Shape } from '../shape'
import type { ShapeRenderData } from '../shape'
import { MIN_SHAPE_SIZE, MAX_SHAPE_SIZE } from '../shape'
import { createShapeForTarget } from '../shapeCreation'
import type { Region } from '../../image/shapeGeometry'
import { clipRegion, intersects, shapeBounds, unionRegion } from '../../image/shapeGeometry'

export interface HillClimbingParams {
  maxShapes: number
  shapeMode: ShapeMode
}

type RenderRegion = (shapes: readonly ShapeRenderData[], region: Region) => Uint8ClampedArray

type Proposal =
  | { kind: 'add'; shapes: Shape[]; changed: Region }
  | { kind: 'remove'; shapes: Shape[]; changed: Region }
  | { kind: 'modify'; shapes: Shape[]; changed: Region }

export class HillClimber {
  shapes: Shape[] = []
  readonly errorMap: Float64Array
  errorSum = 0
  steps = 0
  accepted = 0

  private readonly bounds = new WeakMap<ShapeRenderData, Region>()
  private readonly scratch: Float64Array
  private coordinateSampler: HighErrorCoordinateSampler = () => null
  private shapeSampler: (() => number) | null = null
  private readonly targetForColors: Pick<ImageData, 'width' | 'height' | 'data'>

  constructor(
    private readonly target: FitnessTarget,
    private readonly pixelError: PixelErrorFn,
    private readonly renderRegion: RenderRegion,
    private params: HillClimbingParams
  ) {
    this.validateParams(params)
    this.errorMap = new Float64Array(target.width * target.height)
    this.scratch = new Float64Array(target.width * target.height)
    this.targetForColors = {
      width: target.width,
      height: target.height,
      data: target.rgb
    }
    this.recomputeFull()
  }

  get fitness(): number {
    return fitnessFromError(this.errorSum / this.target.totalWeight)
  }

  setParams(params: HillClimbingParams): void {
    this.validateParams(params)
    this.params = params
  }

  step(): void {
    this.steps++
    const proposal = this.propose()
    const region = clipRegion(proposal.changed, this.target.width, this.target.height)
    if (!region) return

    const visible = this.overlapping(proposal.shapes, region)
    const pixels = this.renderRegion(visible, region)
    const expectedLength = region.width * region.height * 4
    if (pixels.length !== expectedLength) {
      throw new Error(`Region renderer returned ${pixels.length} bytes; expected ${expectedLength}`)
    }

    let delta = 0
    for (let row = 0, i = 0, k = 0; row < region.height; row++) {
      let pixel = (region.y + row) * this.target.width + region.x
      for (let column = 0; column < region.width; column++, pixel++, i += 4, k++) {
        const error = this.pixelError(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!, pixel)
        this.scratch[k] = error
        delta += error - this.errorMap[pixel]!
      }
    }

    const accept = proposal.kind === 'add' ? delta < -1e-9 : delta <= 0
    if (!accept) return

    for (let row = 0, k = 0; row < region.height; row++) {
      let pixel = (region.y + row) * this.target.width + region.x
      for (let column = 0; column < region.width; column++, pixel++, k++) {
        this.errorMap[pixel] = this.scratch[k]!
      }
    }
    this.errorSum += delta
    this.shapes = proposal.shapes
    this.accepted++
  }

  recomputeFull(): void {
    const region = { x: 0, y: 0, width: this.target.width, height: this.target.height }
    const pixels = this.renderRegion([...this.shapes].sort((a, b) => a.z - b.z), region)
    const expectedLength = this.target.width * this.target.height * 4
    if (pixels.length !== expectedLength) {
      throw new Error(`Region renderer returned ${pixels.length} bytes; expected ${expectedLength}`)
    }

    let errorSum = 0
    for (let pixel = 0, offset = 0; pixel < this.errorMap.length; pixel++, offset += 4) {
      const error = this.pixelError(pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!, pixel)
      this.errorMap[pixel] = error
      errorSum += error
    }
    this.errorSum = errorSum
  }

  refreshSamplers(): void {
    const map32 = Float32Array.from(this.errorMap)
    this.coordinateSampler = createHighErrorCoordinateSampler(
      map32,
      this.target.width,
      this.target.height
    )
    this.shapeSampler = this.shapes.length > 0
      ? createHighErrorOverlappingShapeSampler(
          map32,
          this.shapes,
          this.target.width,
          this.target.height
        )
      : null
  }

  private propose(): Proposal {
    const count = this.shapes.length
    const selection = Math.random()
    const addProbability = HILL_CLIMBING_CONFIG.addProbability
    const removeProbability = HILL_CLIMBING_CONFIG.removeProbability

    if (count === 0 || (count < this.params.maxShapes && selection < addProbability)) {
      const sampled = this.coordinateSampler()
      const position = sampled
        ? {
            x: sampled.x / this.target.width * CANVAS_CONFIG.worldSize,
            y: sampled.y / this.target.height * CANVAS_CONFIG.worldSize
          }
        : undefined
      const size = MIN_SHAPE_SIZE + Math.random() ** 2 *
        (MAX_SHAPE_SIZE - MIN_SHAPE_SIZE) * 0.5
      const shape = createShapeForTarget(
        this.params.shapeMode,
        this.targetForColors,
        position,
        size
      )
      return { kind: 'add', shapes: [...this.shapes, shape], changed: this.boundsOf(shape) }
    }

    const removeThreshold = removeProbability + (count < this.params.maxShapes ? addProbability : 0)
    if (count > 1 && selection < removeThreshold) {
      const index = Math.floor(Math.random() * count)
      const removed = this.shapes[index]!
      return {
        kind: 'remove',
        shapes: this.shapes.filter((_, shapeIndex) => shapeIndex !== index),
        changed: this.boundsOf(removed)
      }
    }

    const index = Math.min(
      count - 1,
      this.shapeSampler?.() ?? Math.floor(Math.random() * count)
    )
    const before = this.shapes[index]!
    const after = before.clone()
    after.mutate(sampleStepMultiplier())
    const shapes = this.shapes.slice()
    shapes[index] = after
    return {
      kind: 'modify',
      shapes,
      changed: unionRegion(this.boundsOf(before), this.boundsOf(after))
    }
  }

  private overlapping(shapes: readonly Shape[], region: Region): Shape[] {
    return shapes
      .filter(shape => intersects(this.boundsOf(shape), region))
      .sort((a, b) => a.z - b.z)
  }

  private boundsOf(shape: ShapeRenderData): Region {
    let bounds = this.bounds.get(shape)
    if (!bounds) {
      bounds = shapeBounds(shape)
      this.bounds.set(shape, bounds)
    }
    return bounds
  }

  private validateParams(params: HillClimbingParams): void {
    if (!Number.isInteger(params.maxShapes) || params.maxShapes < 1) {
      throw new RangeError('Maximum shape count must be a positive integer')
    }
    if (params.shapeMode !== 'polygon' && params.shapeMode !== 'fixed') {
      throw new RangeError('Hill climbing shape mode is invalid')
    }
  }
}

function sampleStepMultiplier(): number {
  const sample = Math.random()
  return sample < 0.7 ? 1 : sample < 0.9 ? 4 : 12
}
