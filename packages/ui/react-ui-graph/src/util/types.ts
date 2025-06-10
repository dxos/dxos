//
// Copyright 2025 DXOS.org
//

export type Point = [x: number, y: number];

export type Size = Pick<DOMRect, 'width' | 'height'>;

export type Rect = Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>;
