//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

// TODO(burdon): Base UI type (should not depend on ECHO).
export type HasId = { id: string };

export const Position = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
});

export const GridLayout = Schema.Struct({
  tiles: Schema.Record({ key: Schema.String, value: Position }),
});

export type GridLayout = Schema.Schema.Type<typeof GridLayout>;
