export interface RGBColor {
  r: number
  g: number
  b: number
}

export type ShapeType = 'circle' | 'rectangle' | 'triangle'

export interface ShapeParams {
  type?: ShapeType
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  color?: RGBColor
  alpha?: number
  z?: number
}

export class Shape {
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  color: RGBColor
  alpha: number
  z: number

  constructor(params: ShapeParams = {}) {
    this.type = params.type ?? ['circle', 'rectangle', 'triangle'][Math.floor(Math.random() * 3)] as ShapeType
    this.x = params.x ?? Math.random() * 200
    this.y = params.y ?? Math.random() * 200
    this.width = params.width ?? Math.random() * 50 + 10
    this.height = params.height ?? Math.random() * 50 + 10
    this.rotation = params.rotation ?? Math.random() * Math.PI * 2
    this.color = params.color ?? Shape.randomColor()
    this.alpha = params.alpha ?? Math.random() * 0.8 + 0.2
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

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.fillStyle = this.colorString()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)
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
    ctx.restore()
  }

  renderCircle(ctx: CanvasRenderingContext2D): void {
    const radius = Math.min(this.width, this.height) / 2
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  renderRectangle(ctx: CanvasRenderingContext2D): void {
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height)
  }

  renderTriangle(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath()
    ctx.moveTo(0, -this.height / 2)
    ctx.lineTo(-this.width / 2, this.height / 2)
    ctx.lineTo(this.width / 2, this.height / 2)
    ctx.closePath()
    ctx.fill()
  }

  mutate(): void {
    this.x += (Math.random() - 0.5) * 4
    this.y += (Math.random() - 0.5) * 4

    this.width += (Math.random() - 0.5) * 4
    this.width = Math.max(10, this.width)
    this.height += (Math.random() - 0.5) * 4
    this.height = Math.max(10, this.height)

    this.rotation += (Math.random() - 0.5) * Math.PI * 0.2

    this.alpha += (Math.random() - 0.5) * 0.04
    this.alpha = Math.max(0.3, Math.min(1.0, this.alpha))

    this.z += (Math.random() - 0.5) * 2

    this.color.r = Math.min(255, Math.max(0, this.color.r + Math.floor((Math.random() - 0.5) * 20)))
    this.color.g = Math.min(255, Math.max(0, this.color.g + Math.floor((Math.random() - 0.5) * 20)))
    this.color.b = Math.min(255, Math.max(0, this.color.b + Math.floor((Math.random() - 0.5) * 20)))
    
    if (Math.random() < 0.02) {
      const types: ShapeType[] = ['circle', 'rectangle', 'triangle']
      this.type = types[Math.floor(Math.random() * types.length)] as ShapeType
    }
  }

  clone(): Shape {
    return new Shape({
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      color: { ...this.color },
      alpha: this.alpha,
      z: this.z
    })
  }
} 