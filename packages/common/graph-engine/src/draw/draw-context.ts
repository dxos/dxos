//
// Copyright 2026 DXOS.org
//

import { type Path } from './path';

export type FillStyle = string;
export type StrokeStyle = string;

/**
 * Backend-neutral drawing API. Handlers draw against this; backends adapt to SVG or Canvas.
 */
export interface DrawContext {
  save(): void;
  restore(): void;
  /** Apply a 2D affine transform to subsequent commands. */
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  setFill(style: FillStyle): void;
  setStroke(style: StrokeStyle): void;
  setLineWidth(width: number): void;
  setFont(font: string): void;
  fill(path: Path): void;
  stroke(path: Path): void;
  text(
    content: string,
    x: number,
    y: number,
    opts?: { align?: 'left' | 'center' | 'right'; baseline?: 'top' | 'middle' | 'bottom' },
  ): void;
}
