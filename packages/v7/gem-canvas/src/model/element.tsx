//
// Copyright 2021 DXOS.org
//

import { Bounds, Fraction, Vertex } from '@dxos/gem-x';

// TODO(burdon): Generic (e.g., styles); Common opts (e.g., text).

//
// Circle
//

export type Circle = {
  center: Vertex
  r: Fraction
}

//
// Ellipse
//

export type Ellipse = {
  center: Vertex
  rx: Fraction
  ry: Fraction
}

//
// Rect
//

export type Rect = {
  bounds: Bounds
}

//
// Line
//

export type Line = {
  pos1: Vertex
  pos2: Vertex
}

//
// Path
//

export type CurveType = 'basis' | 'cardinal' | 'linear' | 'step'

export type Path = {
  curve?: CurveType
  closed?: boolean
  points: Vertex[]
}

//
// Elements
//

export type ElementId = string

export type ElementDataType = Circle | Ellipse | Rect | Line | Path

export type ElementType = 'circle' | 'ellipse' | 'rect' | 'line' | 'path'

/**
 * Data element.
 */
export type Element<T extends ElementDataType> = {
  id: ElementId
  type: ElementType
  data: T
}
