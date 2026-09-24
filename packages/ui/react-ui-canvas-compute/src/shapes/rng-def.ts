//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { type ShapeDef, createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs.ts';
import { RandomComponent } from './RNG.tsx';

// Kept out of `RNG.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const RandomShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('rng'),
    min: Schema.optional(Schema.Number),
    max: Schema.optional(Schema.Number),
  }),
);

export type RandomShape = Schema.Schema.Type<typeof RandomShape>;

export type CreateRandomProps = CreateShapeProps<RandomShape>;

export const createRandom = (props: CreateRandomProps) =>
  createShape<RandomShape>({
    type: 'rng',
    size: { width: 64, height: 64 },
    ...props,
  });

export const randomShape: ShapeDef<RandomShape> = {
  type: 'rng',
  name: 'Random',
  icon: 'ph--dice-six--regular',
  component: RandomComponent,
  createShape: createRandom,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
