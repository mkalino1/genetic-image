export interface RGBColor {
  r: number
  g: number
  b: number
}

export type ShapeType = 'circle' | 'rectangle' | 'triangle'
export type ShapeMode = 'fixed' | 'polygon'

export interface ShapeParams {
  type?: ShapeType
  numSides?: number
  vertexAngleOffsets?: number[]
  vertexRadiusMults?: number[]
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  color?: RGBColor
  alpha?: number
  z?: number
  mode?: ShapeMode
}

export class Shape {
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

  constructor(params: ShapeParams = {}) {
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
    this.x = params.x ?? Math.random() * 160
    this.y = params.y ?? Math.random() * 160
    this.width = params.width ?? Math.random() * 60 + 5
    this.height = params.height ?? Math.random() * 60 + 5
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
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.fillStyle = this.colorString()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)

    if (this.mode === 'polygon') {
      this.renderPolygon(ctx)
    } else {
      switch (this.type) {
        case 'circle':
          this.renderCircle(ctx)
          break
        case 'rectangle':
          this.renderRectangle(ctx)
          break
        case 'triangle':
          this.renderTriangle(ctx)
          break
      }
    }
    ctx.restore()
  }

  renderCircle(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    const radius = Math.min(this.width, this.height) / 2
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  renderRectangle(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height)
  }

  renderTriangle(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    ctx.beginPath()
    ctx.moveTo(0, -this.height / 2)
    ctx.lineTo(-this.width / 2, this.height / 2)
    ctx.lineTo(this.width / 2, this.height / 2)
    ctx.closePath()
    ctx.fill()
  }

  renderPolygon(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    const sides = this.numSides
    const baseRadius = Math.min(this.width, this.height) / 2
    ctx.beginPath()
    for (let i = 0; i < sides; i++) {
      const baseAngle = (i / sides) * Math.PI * 2 - Math.PI / 2
      const angleOffset = (this.vertexAngleOffsets && this.vertexAngleOffsets[i]) || 0
      const radiusMult = (this.vertexRadiusMults && this.vertexRadiusMults[i]) || 1
      const angle = baseAngle + angleOffset
      const r = baseRadius * radiusMult
      const vx = r * Math.cos(angle)
      const vy = r * Math.sin(angle)
      if (i === 0) ctx.moveTo(vx, vy)
      else ctx.lineTo(vx, vy)
    }
    ctx.closePath()
    ctx.fill()
  }

  mutate(): void {
    this.x += (Math.random() - 0.5) * 4
    this.y += (Math.random() - 0.5) * 4

    this.width += (Math.random() - 0.5) * 4
    this.width = Math.max(5, this.width)
    this.height += (Math.random() - 0.5) * 4
    this.height = Math.max(5, this.height)

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