/// <reference types="vitest/globals" />

import { prepareFitnessTarget } from '../../app/engine/fitness/fitnessTarget'

describe('fitness target preparation', () => {
  it('composites transparent pixels over the calculated background', () => {
    const target = prepareFitnessTarget({
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        0, 0, 0, 0,
        20, 100, 220, 255
      ])
    } as ImageData)

    expect(target.background).toEqual({ r: 20, g: 100, b: 220 })
    expect(target.backgroundCss).toBe('rgb(20, 100, 220)')
    expect(Array.from(target.rgb)).toEqual([
      20, 100, 220, 255,
      20, 100, 220, 255
    ])
    expect(target.totalWeight).toBeGreaterThan(0)
  })

  it('rejects image data whose dimensions do not match its pixels', () => {
    expect(() => prepareFitnessTarget({
      width: 2,
      height: 2,
      data: new Uint8ClampedArray(4)
    } as ImageData)).toThrow('Target image dimensions do not match its pixel data')
  })
})
