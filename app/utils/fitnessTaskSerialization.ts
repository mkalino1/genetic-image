import type { ShapeRenderData } from './shape'
import type { FitnessTask, PackedFitnessBatch } from '../workers/workerTypes'

const VERTEX_COUNT = 10
const SHAPE_STRIDE = 3 + VERTEX_COUNT * 2 + 10
const TYPE_CODES = {
  circle: 0,
  rectangle: 1,
  triangle: 2
} as const
const TYPE_BY_CODE = ['circle', 'rectangle', 'triangle'] as const

export function packFitnessTasks(tasks: FitnessTask[]): PackedFitnessBatch {
  let shapeCount = 0
  for (const task of tasks) {
    shapeCount += task.shapes.length
  }

  const buffer = new ArrayBuffer(shapeCount * SHAPE_STRIDE * Float64Array.BYTES_PER_ELEMENT)
  const values = new Float64Array(buffer)
  let shapeOffset = 0

  const individuals = tasks.map(({ individualId, shapes }) => {
    const individual = { individualId, shapeOffset, shapeCount: shapes.length }
    for (const shape of shapes) {
      packShape(shape, values, shapeOffset * SHAPE_STRIDE)
      shapeOffset++
    }
    return individual
  })

  return { individuals, shapes: buffer }
}

export function unpackFitnessTasks(batch: PackedFitnessBatch): FitnessTask[] {
  if (batch.shapes.byteLength % (SHAPE_STRIDE * Float64Array.BYTES_PER_ELEMENT) !== 0) {
    throw new Error('Packed fitness shape data has an invalid byte length')
  }

  const values = new Float64Array(batch.shapes)
  const availableShapes = values.length / SHAPE_STRIDE
  return batch.individuals.map(({ individualId, shapeOffset, shapeCount }) => {
    if (
      !Number.isInteger(shapeOffset) ||
      !Number.isInteger(shapeCount) ||
      shapeOffset < 0 ||
      shapeCount < 0 ||
      shapeOffset + shapeCount > availableShapes
    ) {
      throw new Error('Packed fitness task has an invalid shape range')
    }

    const shapes = Array.from({ length: shapeCount }, (_, index) =>
      unpackShape(values, (shapeOffset + index) * SHAPE_STRIDE)
    )
    return { individualId, shapes }
  })
}

function packShape(shape: ShapeRenderData, values: Float64Array, offset: number): void {
  values[offset] = TYPE_CODES[shape.type]
  values[offset + 1] = shape.numSides
  values[offset + 2] = shape.mode === 'polygon' ? 1 : 0

  for (let vertex = 0; vertex < VERTEX_COUNT; vertex++) {
    values[offset + 3 + vertex] = shape.vertexAngleOffsets?.[vertex] ?? 0
    values[offset + 3 + VERTEX_COUNT + vertex] = shape.vertexRadiusMults?.[vertex] ?? 0
  }

  const geometryOffset = offset + 3 + VERTEX_COUNT * 2
  values[geometryOffset] = shape.x
  values[geometryOffset + 1] = shape.y
  values[geometryOffset + 2] = shape.width
  values[geometryOffset + 3] = shape.height
  values[geometryOffset + 4] = shape.rotation
  values[geometryOffset + 5] = shape.color.r
  values[geometryOffset + 6] = shape.color.g
  values[geometryOffset + 7] = shape.color.b
  values[geometryOffset + 8] = shape.alpha
  values[geometryOffset + 9] = shape.z
}

function unpackShape(values: Float64Array, offset: number): ShapeRenderData {
  const typeCode = values[offset]!
  const type = TYPE_BY_CODE[typeCode]
  const modeCode = values[offset + 2]
  if (type === undefined || (modeCode !== 0 && modeCode !== 1)) {
    throw new Error('Packed fitness shape has an invalid type or mode')
  }

  const numSides = values[offset + 1]!
  const shape: ShapeRenderData = {
    type,
    numSides,
    mode: modeCode === 1 ? 'polygon' : 'fixed',
    x: values[offset + 3 + VERTEX_COUNT * 2]!,
    y: values[offset + 4 + VERTEX_COUNT * 2]!,
    width: values[offset + 5 + VERTEX_COUNT * 2]!,
    height: values[offset + 6 + VERTEX_COUNT * 2]!,
    rotation: values[offset + 7 + VERTEX_COUNT * 2]!,
    color: {
      r: values[offset + 8 + VERTEX_COUNT * 2]!,
      g: values[offset + 9 + VERTEX_COUNT * 2]!,
      b: values[offset + 10 + VERTEX_COUNT * 2]!
    },
    alpha: values[offset + 11 + VERTEX_COUNT * 2]!,
    z: values[offset + 12 + VERTEX_COUNT * 2]!
  }

  if (shape.mode === 'polygon') {
    shape.vertexAngleOffsets = Array.from(
      { length: numSides },
      (_, vertex) => values[offset + 3 + vertex]!
    )
    shape.vertexRadiusMults = Array.from(
      { length: numSides },
      (_, vertex) => values[offset + 3 + VERTEX_COUNT + vertex]!
    )
  }

  return shape
}
