//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

// TODO(burdon): Base UI type (should not depend on ECHO).
export type HasId = { id: string };

// TODO(burdon): Physical or logical units?
export const GridPosition = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
});

export type GridPosition = Schema.Schema.Type<typeof GridPosition>;

export const GridLayout = Schema.Struct({
  tiles: Schema.Record({ key: Schema.String, value: GridPosition }),
});

export type GridLayout = Schema.Schema.Type<typeof GridLayout>;
