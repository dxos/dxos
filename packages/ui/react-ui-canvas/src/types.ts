//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

export const Point = S.Struct({ x: S.Number, y: S.Number });
export const Dimension = S.Struct({ width: S.Number, height: S.Number });
export const Rect = S.extend(Point, Dimension);

export type Point = S.Schema.Type<typeof Point>;
export type Dimension = S.Schema.Type<typeof Dimension>;
export type Rect = S.Schema.Type<typeof Rect>;
