//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

export const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number });
export const Dimension = Schema.Struct({ width: Schema.Number, height: Schema.Number });
export const Rect = Schema.extend(Point, Dimension);

export type Point = Schema.Schema.Type<typeof Point>;
export type Dimension = Schema.Schema.Type<typeof Dimension>;
export type Rect = Schema.Schema.Type<typeof Rect>;
