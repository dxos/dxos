//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

export const GridType = Schema.Literal('square', 'triangle', 'hex');
export type GridType = Schema.Schema.Type<typeof GridType>;

export const RepeatMode = Schema.Literal('single', 'repeat');
export type RepeatMode = Schema.Schema.Type<typeof RepeatMode>;

export const Pattern = Schema.Struct({
  name: Schema.optional(Schema.String),
  gridType: GridType.annotations({ description: 'Tile geometry: square, triangle, or hex.' }),
  gridWidth: Schema.Number.annotations({ description: 'Number of columns (axial q range).' }),
  gridHeight: Schema.Number.annotations({ description: 'Number of rows (axial r range).' }),
  tileSize: Schema.Number.annotations({ description: 'Tile side length in mm.' }),
  groutWidth: Schema.Number.annotations({ description: 'Grout gap in mm.' }),
  width: Schema.optional(Schema.Number.annotations({ description: 'Target surface width in mm.' })),
  height: Schema.optional(Schema.Number.annotations({ description: 'Target surface height in mm.' })),
  repeatMode: RepeatMode.annotations({ description: 'Single canvas or repeating motif.' }),
  repeatWidth: Schema.optional(Schema.Number.annotations({ description: 'Motif width in cells (repeat mode).' })),
  repeatHeight: Schema.optional(Schema.Number.annotations({ description: 'Motif height in cells (repeat mode).' })),
  cells: Schema.Record({ key: Schema.String, value: Schema.String }).annotations({
    description: 'Map of "q,r" coordinate keys to color hex strings.',
  }),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.tile',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--grid-nine--regular',
    hue: 'teal',
  }),
);

export interface Pattern extends Schema.Schema.Type<typeof Pattern> {}

export const make = ({
  name,
  gridType = 'square',
  gridWidth = 10,
  gridHeight = 10,
  tileSize = 50,
  groutWidth = 2,
  repeatMode = 'single',
}: {
  name?: string;
  gridType?: GridType;
  gridWidth?: number;
  gridHeight?: number;
  tileSize?: number;
  groutWidth?: number;
  repeatMode?: RepeatMode;
} = {}) =>
  Obj.make(Pattern, {
    name,
    gridType,
    gridWidth,
    gridHeight,
    tileSize,
    groutWidth,
    repeatMode,
    cells: {},
  });
