import { renderShape } from './rendering'
import { CANVAS_CONFIG, EVOLUTION_CONFIG, SHAPE_CONFIG } from './imageEvolutionConfig'
import type { ShapeMode } from './imageEvolutionConfig'

const WORLD_SIZE = CANVAS_CONFIG.worldSize
export const MIN_SHAPE_SIZE = WORLD_SIZE * SHAPE_CONFIG.minimumSizeFraction
export const MAX_SHAPE_SIZE = WORLD_SIZE * SHAPE_CONFIG.maximumSizeFraction
const SHAPE_MUTATION_STEP = WORLD_SIZE * SHAPE_CONFIG.mutationStepFraction

export interface RGBColor {
  r: number
  g: number
  b: number
}

export type ShapeType = 'circle' | 'rectangle' | 'triangle'
const SHAPE_TYPES: ShapeType[] = [...SHAPE_CONFIG.types]

export interface ShapeRenderData {
  type: ShapeType
  numSides: number
  mode: ShapeMode
  vertexAngleOffsets?: number[]
  vertexRadiusMults?: number[]
  x: number
  y: number
  width: number
  height: number
  rotation: number
  color: RGBColor
  alpha: number
  z: number
}

export class Shape implements ShapeRenderData {
  type: ShapeType
  numSides: number
  mode: ShapeMode
  vertexAngleOffsets?: number[]
  vertexRadiusMults?: number[]
  x: number
  y: number
  width: number
  height: number
  rotation: number
  color: RGBColor
  alpha: number
  z: number

  constructor(params: Partial<ShapeRenderData> = {}) {
    this.mode = params.mode ?? EVOLUTION_CONFIG.defaults.shapeMode
    if (this.mode === 'polygon') {
      this.type = 'triangle'
      const polygon = SHAPE_CONFIG.polygon
      this.numSides = params.numSides ?? Math.floor(
        Math.random() * (polygon.initialMaximumSides - polygon.initialMinimumSides + 1)
      ) + polygon.initialMinimumSides
      // initialize per-vertex irregularity (angle offsets and radius multipliers)
      const pa = params.vertexAngleOffsets
      const pr = params.vertexRadiusMults
      if (Array.isArray(pa) && Array.isArray(pr) && pa.length === this.numSides && pr.length === this.numSides) {
        this.vertexAngleOffsets = pa.slice()
        this.vertexRadiusMults = pr.slice()
      } else {
        this.vertexAngleOffsets = new Array(this.numSides).fill(0).map(() =>
          (Math.random() - 0.5) * polygon.initialAngleOffsetRange
        )
        this.vertexRadiusMults = new Array(this.numSides).fill(0).map(() =>
          polygon.initialRadiusMultiplierMinimum + Math.random() * polygon.initialRadiusMultiplierRange
        )
      }
    } else {
      this.type = params.type ?? SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)] as ShapeType
      this.numSides = 0
    }
    this.x = clamp(params.x ?? Math.random() * WORLD_SIZE, 0, WORLD_SIZE)
    this.y = clamp(params.y ?? Math.random() * WORLD_SIZE, 0, WORLD_SIZE)
    this.width = clamp(params.width ?? Math.random() * (MAX_SHAPE_SIZE - MIN_SHAPE_SIZE) + MIN_SHAPE_SIZE, MIN_SHAPE_SIZE, MAX_SHAPE_SIZE)
    this.height = clamp(params.height ?? Math.random() * (MAX_SHAPE_SIZE - MIN_SHAPE_SIZE) + MIN_SHAPE_SIZE, MIN_SHAPE_SIZE, MAX_SHAPE_SIZE)
    this.rotation = params.rotation ?? Math.random() * SHAPE_CONFIG.maximumInitialRotation
    this.color = params.color ?? Shape.randomColor()
    this.alpha = params.alpha ?? Math.random() *
      SHAPE_CONFIG.initialAlphaRange + SHAPE_CONFIG.initialAlphaMinimum
    this.z = params.z ?? Math.random() * SHAPE_CONFIG.maximumInitialDepth
  }

  static randomColor(): RGBColor {
    return {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256)
    }
  }

  colorString(): string {
    return `rgb(${this.color.r},${this.color.g},${this.color.b})`
  }

  render(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    renderShape(this, ctx)
  }

  mutate(): void {
    this.x = clamp(this.x + randomMutationDelta(SHAPE_MUTATION_STEP), 0, WORLD_SIZE)
    this.y = clamp(this.y + randomMutationDelta(SHAPE_MUTATION_STEP), 0, WORLD_SIZE)

    this.width = clamp(this.width + randomMutationDelta(SHAPE_MUTATION_STEP), MIN_SHAPE_SIZE, MAX_SHAPE_SIZE)
    this.height = clamp(this.height + randomMutationDelta(SHAPE_MUTATION_STEP), MIN_SHAPE_SIZE, MAX_SHAPE_SIZE)

    this.rotation += randomMutationDelta(SHAPE_CONFIG.mutationSteps.rotation)

    this.alpha += randomMutationDelta(SHAPE_CONFIG.mutationSteps.alpha)
    this.alpha = Math.max(
      SHAPE_CONFIG.minimumAlpha,
      Math.min(SHAPE_CONFIG.maximumAlpha, this.alpha)
    )

    this.z += randomMutationDelta(SHAPE_CONFIG.mutationSteps.depth)

    this.color.r = clamp(this.color.r + Math.floor(randomMutationDelta(SHAPE_CONFIG.mutationSteps.color)), 0, 255)
    this.color.g = clamp(this.color.g + Math.floor(randomMutationDelta(SHAPE_CONFIG.mutationSteps.color)), 0, 255)
    this.color.b = clamp(this.color.b + Math.floor(randomMutationDelta(SHAPE_CONFIG.mutationSteps.color)), 0, 255)

    if (this.mode === 'polygon') {
      const polygon = SHAPE_CONFIG.polygon
      if (Math.random() < polygon.sideCountMutationProbability) {
        // Mutate number of sides occasionally
        this.numSides += Math.random() < polygon.sideIncrementProbability ? 1 : -1
        this.numSides = Math.max(polygon.minimumSides, Math.min(polygon.maximumSides, this.numSides))
        // adjust arrays if numSides changed
        if (this.vertexAngleOffsets && this.vertexRadiusMults && this.vertexAngleOffsets.length !== this.numSides) {
          const newAngles = new Array(this.numSides).fill(0).map((_, idx) =>
            this.vertexAngleOffsets?.[idx] ?? (Math.random() - 0.5) * polygon.initialAngleOffsetRange
          )
          const newRads = new Array(this.numSides).fill(0).map((_, idx) =>
            this.vertexRadiusMults?.[idx] ??
              polygon.initialRadiusMultiplierMinimum + Math.random() * polygon.initialRadiusMultiplierRange
          )
          this.vertexAngleOffsets = newAngles
          this.vertexRadiusMults = newRads
        }
      }

      if (this.vertexAngleOffsets && this.vertexRadiusMults) {
        for (let i = 0; i < this.vertexAngleOffsets.length; i++) {
          if (Math.random() < polygon.vertexMutationProbability) {
            this.vertexAngleOffsets[i]! += randomMutationDelta(polygon.angleMutationStep)
          }
          if (Math.random() < polygon.vertexMutationProbability) {
            this.vertexRadiusMults[i]! += randomMutationDelta(polygon.radiusMutationStep)
          }
          this.vertexRadiusMults[i] = Math.max(
            polygon.minimumRadiusMultiplier,
            Math.min(polygon.maximumRadiusMultiplier, this.vertexRadiusMults[i]!)
          )
        }
      }
    } else if (Math.random() < SHAPE_CONFIG.fixedShapeTypeMutationProbability) {
      // Mutate shape type for fixed shapes
      this.type = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)] as ShapeType
    }
  }

  clone(): Shape {
    return new Shape({
      type: this.type,
      numSides: this.numSides,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      color: { ...this.color },
      alpha: this.alpha,
      z: this.z,
      mode: this.mode,
      vertexAngleOffsets: this.vertexAngleOffsets,
      vertexRadiusMults: this.vertexRadiusMults
    })
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function randomMutationDelta(step: number): number {
  const random = Math.random() * SHAPE_CONFIG.mutationDeltaRandomRange
  return random < SHAPE_CONFIG.mutationDeltaActivationThreshold
    ? 0
    : (random - SHAPE_CONFIG.mutationDeltaCenter) * step
}
