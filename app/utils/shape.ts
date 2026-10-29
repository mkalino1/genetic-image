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
    if (this.mode === 'polygon') {
      const polygon = SHAPE_CONFIG.polygon
      if (Math.random() < polygon.sideCountMutationProbability) {
        this.numSides += Math.random() < polygon.sideIncrementProbability ? 1 : -1
        this.numSides = clamp(this.numSides, polygon.minimumSides, polygon.maximumSides)
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
        return
      }
    } else if (Math.random() < SHAPE_CONFIG.fixedShapeTypeMutationProbability) {
      this.type = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)] as ShapeType
      return
    }

    const mutationTargetCount = this.mode === 'polygon' ? 12 : 10
    const mutationTarget = Math.floor(Math.random() * mutationTargetCount)
    switch (mutationTarget) {
      case 0:
        this.x = clamp(this.x + randomMutationDelta(SHAPE_MUTATION_STEP), 0, WORLD_SIZE)
        break
      case 1:
        this.y = clamp(this.y + randomMutationDelta(SHAPE_MUTATION_STEP), 0, WORLD_SIZE)
        break
      case 2:
        this.width = clamp(this.width + randomMutationDelta(SHAPE_MUTATION_STEP), MIN_SHAPE_SIZE, MAX_SHAPE_SIZE)
        break
      case 3:
        this.height = clamp(this.height + randomMutationDelta(SHAPE_MUTATION_STEP), MIN_SHAPE_SIZE, MAX_SHAPE_SIZE)
        break
      case 4:
        this.rotation += randomMutationDelta(SHAPE_CONFIG.mutationSteps.rotation)
        break
      case 5:
        this.alpha = clamp(
          this.alpha + randomMutationDelta(SHAPE_CONFIG.mutationSteps.alpha),
          SHAPE_CONFIG.minimumAlpha,
          SHAPE_CONFIG.maximumAlpha
        )
        break
      case 6:
        this.z += randomMutationDelta(SHAPE_CONFIG.mutationSteps.depth)
        break
      case 7:
      case 8:
      case 9: {
        const colorChannel = ['r', 'g', 'b'][mutationTarget - 7] as keyof RGBColor
        this.color[colorChannel] = clamp(
          this.color[colorChannel] + Math.floor(
            randomMutationDelta(SHAPE_CONFIG.mutationSteps.color)
          ),
          0,
          255
        )
        break
      }
      case 10:
      case 11: {
        const vertexIndex = Math.floor(Math.random() * this.numSides)
        if (mutationTarget === 10 && this.vertexAngleOffsets) {
          this.vertexAngleOffsets[vertexIndex]! += randomMutationDelta(
            SHAPE_CONFIG.polygon.angleMutationStep
          )
        } else if (mutationTarget === 11 && this.vertexRadiusMults) {
          this.vertexRadiusMults[vertexIndex] = clamp(
            this.vertexRadiusMults[vertexIndex]! + randomMutationDelta(
              SHAPE_CONFIG.polygon.radiusMutationStep
            ),
            SHAPE_CONFIG.polygon.minimumRadiusMultiplier,
            SHAPE_CONFIG.polygon.maximumRadiusMultiplier
          )
        }
        break
      }
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
  return (Math.random() - 0.5) * step
}
