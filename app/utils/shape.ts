import { renderShape } from './rendering'
import { WORLD_SIZE } from './canvasDimensions'

export const MIN_SHAPE_SIZE = WORLD_SIZE / 40
export const MAX_SHAPE_SIZE = WORLD_SIZE * 20 / 40
const SHAPE_MUTATION_STEP = WORLD_SIZE / 40

export interface RGBColor {
  r: number
  g: number
  b: number
}

export type ShapeType = 'circle' | 'rectangle' | 'triangle'
export type ShapeMode = 'fixed' | 'polygon'

const SHAPE_TYPES: ShapeType[] = ['circle', 'rectangle', 'triangle']

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
    this.mode = params.mode ?? 'fixed'
    if (this.mode === 'polygon') {
      this.type = 'triangle'
      this.numSides = params.numSides ?? Math.floor(Math.random() * 4) + 3 // 3-6 sides
      // initialize per-vertex irregularity (angle offsets and radius multipliers)
      const pa = params.vertexAngleOffsets
      const pr = params.vertexRadiusMults
      if (Array.isArray(pa) && Array.isArray(pr) && pa.length === this.numSides && pr.length === this.numSides) {
        this.vertexAngleOffsets = pa.slice()
        this.vertexRadiusMults = pr.slice()
      } else {
        this.vertexAngleOffsets = new Array(this.numSides).fill(0).map(() => (Math.random() - 0.5) * 0.6) // up to ±0.3 radians
        this.vertexRadiusMults = new Array(this.numSides).fill(0).map(() => 0.6 + Math.random() * 0.8) // 0.6-1.4 multiplier
      }
    } else {
      this.type = params.type ?? SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)] as ShapeType
      this.numSides = 0
    }
    this.x = clamp(params.x ?? Math.random() * WORLD_SIZE, 0, WORLD_SIZE)
    this.y = clamp(params.y ?? Math.random() * WORLD_SIZE, 0, WORLD_SIZE)
    this.width = clamp(params.width ?? Math.random() * (MAX_SHAPE_SIZE - MIN_SHAPE_SIZE) + MIN_SHAPE_SIZE, MIN_SHAPE_SIZE, MAX_SHAPE_SIZE)
    this.height = clamp(params.height ?? Math.random() * (MAX_SHAPE_SIZE - MIN_SHAPE_SIZE) + MIN_SHAPE_SIZE, MIN_SHAPE_SIZE, MAX_SHAPE_SIZE)
    this.rotation = params.rotation ?? Math.random() * Math.PI * 2
    this.color = params.color ?? Shape.randomColor()
    this.alpha = params.alpha ?? Math.random() * 0.7 + 0.3
    this.z = params.z ?? Math.random() * 100
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

    this.rotation += randomMutationDelta(Math.PI * 0.2)

    this.alpha += randomMutationDelta(0.04)
    this.alpha = Math.max(0.3, Math.min(1.0, this.alpha))

    this.z += randomMutationDelta(5)

    this.color.r = clamp(this.color.r + Math.floor(randomMutationDelta(20)), 0, 255)
    this.color.g = clamp(this.color.g + Math.floor(randomMutationDelta(20)), 0, 255)
    this.color.b = clamp(this.color.b + Math.floor(randomMutationDelta(20)), 0, 255)

    if (this.mode === 'polygon') {
      if (Math.random() < 0.02) {
        // Mutate number of sides occasionally
        this.numSides += Math.random() < 0.5 ? 1 : -1
        this.numSides = Math.max(3, Math.min(10, this.numSides))
        // adjust arrays if numSides changed
        if (this.vertexAngleOffsets && this.vertexRadiusMults && this.vertexAngleOffsets.length !== this.numSides) {
          const newAngles = new Array(this.numSides).fill(0).map((_, idx) => this.vertexAngleOffsets?.[idx] ?? (Math.random() - 0.5) * 0.6)
          const newRads = new Array(this.numSides).fill(0).map((_, idx) => this.vertexRadiusMults?.[idx] ?? 0.6 + Math.random() * 0.8)
          this.vertexAngleOffsets = newAngles
          this.vertexRadiusMults = newRads
        }
      }

      if (this.vertexAngleOffsets && this.vertexRadiusMults) {
        for (let i = 0; i < this.vertexAngleOffsets.length; i++) {
          if (Math.random() < 0.3) this.vertexAngleOffsets[i]! += randomMutationDelta(0.12)
          if (Math.random() < 0.3) this.vertexRadiusMults[i]! += randomMutationDelta(0.08)
          this.vertexRadiusMults[i] = Math.max(0.2, Math.min(2.0, this.vertexRadiusMults[i]!))
        }
      }
    } else if (Math.random() < 0.02) {
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
  const random = Math.random() * 2
  return random < 1 ? 0 : (random - 1.5) * step
}
