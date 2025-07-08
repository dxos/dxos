//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

// TODO(burdon): Base UI type (should not depend on ECHO).
export type HasId = { id: string };

export const Size = Schema.Struct({
  width: Schema.Number,
  height: Schema.Number,
});
export type Size = Schema.Schema.Type<typeof Size>;

export const Position = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
});
export type Position = Schema.Schema.Type<typeof Position>;

export const CellLayout = Schema.extend(Position, Schema.partial(Size));
export type CellLayout = Schema.Schema.Type<typeof CellLayout>;

export const BoardLayout = Schema.Struct({
  // TODO(burdon): Must be odd numbered since (0,0) must be the center.
  size: Schema.Struct({
    width: Schema.Number,
    height: Schema.Number,
  }),
  cells: Schema.Record({
    key: Schema.String,
    value: CellLayout,
  }),
});

export type BoardLayout = Schema.Schema.Type<typeof BoardLayout>;
