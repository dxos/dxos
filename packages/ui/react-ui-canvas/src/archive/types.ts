//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number });
export const Dimension = Schema.Struct({ width: Schema.Number, height: Schema.Number });
export const Rect = Point.mapFields(Struct.assign(Dimension.fields));

export type Point = Schema.Schema.Type<typeof Point>;
export type Dimension = Schema.Schema.Type<typeof Dimension>;
export type Rect = Schema.Schema.Type<typeof Rect>;
