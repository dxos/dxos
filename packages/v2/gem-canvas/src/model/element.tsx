//
// Copyright 2021 DXOS.org
//

import { Bounds, Fraction, Vertex } from '@dxos/gem-core';

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
  text?: string
}

//
// Rect
//

export type Rect = {
  bounds: Bounds
  text?: string
  style?: string // TODO(burdon): Generalize.
}

//
// Line
//

export type Line = {
  source: {
    pos?: Vertex
    id?: ElementId
    handle?: string // E.g., 'w', 'wn', 'ws' (12 points).
  }
  target: {
    pos?: Vertex
    id?: ElementId
    handle?: string
  }
}

//
// Path
//

export type CurveType = 'basis' | 'cardinal' | 'linear' | 'step'

export type Path = {
  points: Vertex[]
  curve?: CurveType
  closed?: boolean
}

//
// Elements
//

export type ElementId = string

export type ElementDataType = Circle | Ellipse | Rect | Line | Path

export type ElementType = 'circle' | 'ellipse' | 'rect' | 'line' | 'path'

// TODO(burdon): Instead of inheritance separate type for className, style, etc.
// TODO(burdon): Property for group (e.g., contain rect and text).

export type Style = {
  class?: string
  style: any
}

/**
 * Data element.
 */
export type ElementData<T extends ElementDataType> = {
  id: ElementId
  type: ElementType
  order?: number
  data: T
}
