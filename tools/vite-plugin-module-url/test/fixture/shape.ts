//
// Copyright 2026 DXOS.org
//

export type Point = { readonly x: number; readonly y: number };

export const distance = (from: Point, to: Point): number => Math.hypot(to.x - from.x, to.y - from.y);
