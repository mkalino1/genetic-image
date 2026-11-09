export interface RgbColor {
  r: number
  g: number
  b: number
}

export function calculateBackgroundColor(imageData: ImageData): RgbColor {
  const data = imageData.data
  let r = 0
  let g = 0
  let b = 0
  let totalAlpha = 0

  for (let offset = 0; offset < data.length; offset += 4) {
    const alpha = data[offset + 3]! / 255
    r += data[offset]! * alpha
    g += data[offset + 1]! * alpha
    b += data[offset + 2]! * alpha
    totalAlpha += alpha
  }

  if (totalAlpha === 0) {
    return { r: 255, g: 255, b: 255 }
  }

  return {
    r: Math.round(r / totalAlpha),
    g: Math.round(g / totalAlpha),
    b: Math.round(b / totalAlpha)
  }
}

export function compositeImageData(
  imageData: ImageData,
  background: RgbColor
): Uint8ClampedArray<ArrayBuffer> {
  const source = imageData.data
  const composited = new Uint8ClampedArray(new ArrayBuffer(source.length))

  for (let offset = 0; offset < source.length; offset += 4) {
    const alpha = source[offset + 3]! / 255
    composited[offset] = source[offset]! * alpha + background.r * (1 - alpha)
    composited[offset + 1] = source[offset + 1]! * alpha + background.g * (1 - alpha)
    composited[offset + 2] = source[offset + 2]! * alpha + background.b * (1 - alpha)
    composited[offset + 3] = 255
  }

  return composited
}
