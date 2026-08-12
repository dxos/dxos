//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

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

export const CellLayout = Position.pipe(Schema.fieldsAssign(Size.mapFields(Struct.map(Schema.optional)).fields));
export type CellLayout = Schema.Schema.Type<typeof CellLayout>;

export const BoardLayout = Schema.Struct({
  // TODO(burdon): Should be odd numbered since (0,0) is the center.
  size: Schema.Struct({
    width: Schema.Number,
    height: Schema.Number,
  }),

  // v4 restricts `mutable` to arrays; a mutable object property is expressed per key.
  cells: Schema.mutableKey(Schema.Record(Schema.String, CellLayout)),
});

export type BoardLayout = Schema.Schema.Type<typeof BoardLayout>;

/** A 7×5 board with no items — the persisted default for a new board. */
export const defaultLayout: BoardLayout = { size: { width: 7, height: 5 }, cells: {} };
