/// <reference types="vitest/globals" />

import { calculateBackgroundColor, compositeImageData } from '../../../app/engine/image/backgroundColor'

describe('fitness background color', () => {
  it('calculates the average color used by the preview', () => {
    const imageData = {
      data: new Uint8ClampedArray([40, 80, 120, 255, 60, 100, 140, 255])
    } as ImageData

    expect(calculateBackgroundColor(imageData)).toEqual({ r: 50, g: 90, b: 130 })
  })

  it('does not let transparent black pixels darken the background', () => {
    const imageData = {
      data: new Uint8ClampedArray([
        0, 0, 0, 0,
        40, 80, 120, 255
      ])
    } as ImageData

    expect(calculateBackgroundColor(imageData)).toEqual({ r: 40, g: 80, b: 120 })
  })

  it('uses white when the target is entirely transparent', () => {
    const imageData = {
      data: new Uint8ClampedArray([0, 0, 0, 0])
    } as ImageData

    expect(calculateBackgroundColor(imageData)).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('composites transparent and partially transparent pixels over the background', () => {
    const imageData = {
      data: new Uint8ClampedArray([
        255, 0, 0, 0,
        255, 0, 0, 128,
        255, 0, 0, 255
      ])
    } as ImageData

    expect([...compositeImageData(imageData, { r: 0, g: 100, b: 200 })]).toEqual([
      0, 100, 200, 255,
      128, 50, 100, 255,
      255, 0, 0, 255
    ])
  })
})
