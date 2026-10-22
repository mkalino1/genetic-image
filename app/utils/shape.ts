import { renderShape } from './rendering'
import { WORLD_SIZE } from './canvasDimensions'

export const MIN_SHAPE_SIZE = WORLD_SIZE / 40
export const MAX_SHAPE_SIZE = WORLD_SIZE * 12 / 40
const SHAPE_MUTATION_STEP = WORLD_SIZE / 40

export interface RGBColor {
  r: number
  g: number
  b: number
}

export type ShapeType = 'circle' | 'rectangle' | 'triangle'
export type ShapeMode = 'fixed' | 'polygon'

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
      this.type = params.type ?? ['circle', 'rectangle', 'triangle'][Math.floor(Math.random() * 3)] as ShapeType
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
    this.x = clamp(this.x + (Math.random() - 0.5) * SHAPE_MUTATION_STEP, 0, WORLD_SIZE)
    this.y = clamp(this.y + (Math.random() - 0.5) * SHAPE_MUTATION_STEP, 0, WORLD_SIZE)

    this.width = clamp(this.width + (Math.random() - 0.5) * SHAPE_MUTATION_STEP, MIN_SHAPE_SIZE, MAX_SHAPE_SIZE)
    this.height = clamp(this.height + (Math.random() - 0.5) * SHAPE_MUTATION_STEP, MIN_SHAPE_SIZE, MAX_SHAPE_SIZE)

    this.rotation += (Math.random() - 0.5) * Math.PI * 0.2

    this.alpha += (Math.random() - 0.5) * 0.04
    this.alpha = Math.max(0.3, Math.min(1.0, this.alpha))

    this.z += (Math.random() - 0.5) * 5

    this.color.r = Math.min(255, Math.max(0, this!.color.r + Math.floor((Math.random() - 0.5) * 20)))
    this.color.g = Math.min(255, Math.max(0, this.color.g + Math.floor((Math.random() - 0.5) * 20)))
    this.color.b = Math.min(255, Math.max(0, this.color.b + Math.floor((Math.random() - 0.5) * 20)))
    
    if (this.mode === 'polygon') {
      // Mutate number of sides occasionally
      if (Math.random() < 0.02) {
        this.numSides += Math.random() < 0.5 ? 1 : -1
        this.numSides = Math.max(3, Math.min(10, this.numSides))
      }
      // Mutate polygon vertex parameters
      if (this.vertexAngleOffsets && this.vertexRadiusMults) {
        // mutate existing offsets
        for (let i = 0; i < this.vertexAngleOffsets.length; i++) {
          if (Math.random() < 0.3) this.vertexAngleOffsets[i]! += (Math.random() - 0.5) * 0.12
          if (Math.random() < 0.3) this.vertexRadiusMults[i]! += (Math.random() - 0.5) * 0.08
          this.vertexRadiusMults[i] = Math.max(0.2, Math.min(2.0, this.vertexRadiusMults[i]!))
        }
        // adjust arrays if numSides changed
        if (this.vertexAngleOffsets.length !== this.numSides) {
          const newAngles = new Array(this.numSides).fill(0).map((_, idx) => this.vertexAngleOffsets?.[idx] ?? (Math.random() - 0.5) * 0.6)
          const newRads = new Array(this.numSides).fill(0).map((_, idx) => this.vertexRadiusMults?.[idx] ?? 0.6 + Math.random() * 0.8)
          this.vertexAngleOffsets = newAngles
          this.vertexRadiusMults = newRads
        }
      }
    } else {
      // Mutate shape type for fixed shapes
      if (Math.random() < 0.02) {
        const types: ShapeType[] = ['circle', 'rectangle', 'triangle']
        this.type = types[Math.floor(Math.random() * types.length)] as ShapeType
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
