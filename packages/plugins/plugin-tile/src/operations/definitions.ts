//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Tile } from '#types';

export const Create = Operation.make({
  meta: {
    key: 'org.dxos.function.tile.create',
    name: 'Create Tile Pattern',
    description: 'Creates a new tile pattern with grid configuration.',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    gridType: Schema.optional(Tile.GridType),
    gridWidth: Schema.optional(Schema.Number),
    gridHeight: Schema.optional(Schema.Number),
    tileSize: Schema.optional(Schema.Number),
    groutWidth: Schema.optional(Schema.Number),
  }),
  output: Tile.Pattern,
  services: [Database.Service],
});

export const ApplyPreset = Operation.make({
  meta: {
    key: 'org.dxos.function.tile.apply-preset',
    name: 'Apply Preset',
    description: 'Fills a tile pattern with a named tessellation preset.',
  },
  input: Schema.Struct({
    pattern: Tile.Pattern,
    preset: Schema.String,
    colorCount: Schema.Number,
  }),
  output: Tile.Pattern,
  services: [Database.Service],
});
