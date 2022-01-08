//
// Copyright 2021 DXOS.org
//

import { Num } from '@dxos/gem-x';

export type Circle = {
  cx: Num
  cy: Num
  r: Num
}

export type Ellipse = {
  cx: Num
  cy: Num
  rx: Num
  ry: Num
}

export type Rect = {
  x: Num
  y: Num
  width: Num
  height: Num
}

export type Line = {
  x1: Num
  y1: Num
  x2: Num
  y2: Num
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
