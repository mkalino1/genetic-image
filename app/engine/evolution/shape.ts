import { renderShape } from '../image/shapeRendering'
import { CANVAS_CONFIG, EVOLUTION_CONFIG, SHAPE_CONFIG } from '../config'
import type { ShapeMode } from '../config'

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

  mutate(stepMultiplier = 1): void {
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
        this.x = mutateNumber(
          this.x,
          SHAPE_MUTATION_STEP * stepMultiplier,
          { minimum: 0, maximum: WORLD_SIZE }
        )
        break
      case 1:
        this.y = mutateNumber(
          this.y,
          SHAPE_MUTATION_STEP * stepMultiplier,
          { minimum: 0, maximum: WORLD_SIZE }
        )
        break
      case 2:
        this.width = mutateNumber(
          this.width,
          SHAPE_MUTATION_STEP * stepMultiplier,
          { minimum: MIN_SHAPE_SIZE, maximum: MAX_SHAPE_SIZE }
        )
        break
      case 3:
        this.height = mutateNumber(
          this.height,
          SHAPE_MUTATION_STEP * stepMultiplier,
          { minimum: MIN_SHAPE_SIZE, maximum: MAX_SHAPE_SIZE }
        )
        break
      case 4:
        this.rotation = mutateNumber(
          this.rotation,
          SHAPE_CONFIG.mutationSteps.rotation * stepMultiplier
        )
        break
      case 5:
        this.alpha = mutateNumber(
          this.alpha,
          SHAPE_CONFIG.mutationSteps.alpha * stepMultiplier,
          {
            minimum: SHAPE_CONFIG.minimumAlpha,
            maximum: SHAPE_CONFIG.maximumAlpha
          }
        )
        break
      case 6:
        this.z = mutateNumber(
          this.z,
          SHAPE_CONFIG.mutationSteps.depth * stepMultiplier
        )
        break
      case 7:
      case 8:
      case 9: {
        const colorChannel = ['r', 'g', 'b'][mutationTarget - 7] as keyof RGBColor
        this.color[colorChannel] = mutateNumber(
          this.color[colorChannel],
          SHAPE_CONFIG.mutationSteps.color * stepMultiplier,
          { minimum: 0, maximum: 255, integerDelta: 'floor' }
        )
        break
      }
      case 10:
      case 11: {
        const vertexIndex = Math.floor(Math.random() * this.numSides)
        if (mutationTarget === 10 && this.vertexAngleOffsets) {
          this.vertexAngleOffsets[vertexIndex] = mutateNumber(
            this.vertexAngleOffsets[vertexIndex]!,
            SHAPE_CONFIG.polygon.angleMutationStep * stepMultiplier
          )
        } else if (mutationTarget === 11 && this.vertexRadiusMults) {
          this.vertexRadiusMults[vertexIndex] = mutateNumber(
            this.vertexRadiusMults[vertexIndex]!,
            SHAPE_CONFIG.polygon.radiusMutationStep * stepMultiplier,
            {
              minimum: SHAPE_CONFIG.polygon.minimumRadiusMultiplier,
              maximum: SHAPE_CONFIG.polygon.maximumRadiusMultiplier
            }
          )
        }
        break
      }
    }
  }

  mutateAll(stepMultiplier = 1): void {
    this.x = mutateNumber(
      this.x,
      SHAPE_MUTATION_STEP * stepMultiplier,
      { minimum: 0, maximum: WORLD_SIZE }
    )
    this.y = mutateNumber(
      this.y,
      SHAPE_MUTATION_STEP * stepMultiplier,
      { minimum: 0, maximum: WORLD_SIZE }
    )
    this.width = mutateNumber(
      this.width,
      SHAPE_MUTATION_STEP * stepMultiplier,
      {
        minimum: MIN_SHAPE_SIZE,
        maximum: MAX_SHAPE_SIZE
      }
    )
    this.height = mutateNumber(
      this.height,
      SHAPE_MUTATION_STEP * stepMultiplier,
      {
        minimum: MIN_SHAPE_SIZE,
        maximum: MAX_SHAPE_SIZE
      }
    )
    this.rotation = mutateNumber(
      this.rotation,
      SHAPE_CONFIG.mutationSteps.rotation * stepMultiplier
    )
    this.alpha = mutateNumber(
      this.alpha,
      SHAPE_CONFIG.mutationSteps.alpha * stepMultiplier,
      {
        minimum: SHAPE_CONFIG.minimumAlpha,
        maximum: SHAPE_CONFIG.maximumAlpha
      }
    )
    this.z = mutateNumber(
      this.z,
      SHAPE_CONFIG.mutationSteps.depth * stepMultiplier
    )
    for (const channel of ['r', 'g', 'b'] as const) {
      this.color[channel] = mutateNumber(
        this.color[channel],
        SHAPE_CONFIG.mutationSteps.color * stepMultiplier,
        {
          minimum: 0,
          maximum: 255,
          integerDelta: 'round'
        }
      )
    }

    if (this.mode === 'fixed') {
      const availableTypes = SHAPE_TYPES.filter(type => type !== this.type)
      this.type = availableTypes[Math.floor(Math.random() * availableTypes.length)]!
      return
    }

    const polygon = SHAPE_CONFIG.polygon
    const sideDelta = this.numSides === polygon.maximumSides
      ? -1
      : this.numSides === polygon.minimumSides
        ? 1
        : Math.random() < 0.5 ? -1 : 1
    this.numSides += sideDelta
    this.vertexAngleOffsets ??= []
    this.vertexRadiusMults ??= []
    this.vertexAngleOffsets.length = this.numSides
    this.vertexRadiusMults.length = this.numSides
    for (let index = 0; index < this.numSides; index++) {
      const angleOffset = this.vertexAngleOffsets[index] ??
        (Math.random() - 0.5) * polygon.initialAngleOffsetRange
      this.vertexAngleOffsets[index] = mutateNumber(
        angleOffset,
        polygon.angleMutationStep * stepMultiplier
      )

      const radiusMultiplier = this.vertexRadiusMults[index] ??
        polygon.initialRadiusMultiplierMinimum + Math.random() * polygon.initialRadiusMultiplierRange
      this.vertexRadiusMults[index] = mutateNumber(
        radiusMultiplier,
        polygon.radiusMutationStep * stepMultiplier,
        {
          minimum: polygon.minimumRadiusMultiplier,
          maximum: polygon.maximumRadiusMultiplier
        }
      )
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

interface MutationOptions {
  minimum?: number
  maximum?: number
  integerDelta?: 'floor' | 'round'
}

function mutateNumber(
  value: number,
  step: number,
  options: MutationOptions = {}
): number {
  let delta = randomMutationDelta(step)
  if (options.integerDelta === 'floor') delta = Math.floor(delta)
  if (options.integerDelta === 'round') delta = Math.round(delta)

  let mutatedValue = value + delta
  if (options.minimum !== undefined && options.maximum !== undefined) {
    mutatedValue = clamp(mutatedValue, options.minimum, options.maximum)
  }
  return mutatedValue
}
