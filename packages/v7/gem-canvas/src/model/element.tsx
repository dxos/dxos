//
// Copyright 2021 DXOS.org
//

import { Fraction } from '@dxos/gem-x';

export type Circle = {
  cx: number | Fraction
  cy: number | Fraction
  r: number | Fraction
}

export type Ellipse = {
  cx: number | Fraction
  cy: number | Fraction
  rx: number | Fraction
  ry: number | Fraction
}

export type Rect = {
  x: number | Fraction
  y: number | Fraction
  width: number | Fraction
  height: number | Fraction
}

export type Line = {
  x1: number | Fraction
  y1: number | Fraction
  x2: number | Fraction
  y2: number | Fraction
}

export type PathType = 'linear' | 'basis' | 'cardinal' | 'step'

export type Path = {
  type?: PathType
  closed?: boolean
  points: [ x: number, y: number ][]
}

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
