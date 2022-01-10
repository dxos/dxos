//
// Copyright 2021 DXOS.org
//

import { Bounds, Fraction, Vector } from '@dxos/gem-x';

// TODO(burdon): Generic (e.g., styles); Common opts (e.g., text).

//
// Circle
//

export type Circle = {
  center: Vector
  r: Fraction
}

//
// Ellipse
//

export type Ellipse = {
  center: Vector
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
  pos1: Vector
  pos2: Vector
}

//
// Path
//

export type PathType = 'linear' | 'basis' | 'cardinal' | 'step'

export type Path = {
  type?: PathType
  closed?: boolean
  points: Vector[]
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
