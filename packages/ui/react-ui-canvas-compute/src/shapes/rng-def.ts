//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { createPorts, defineComputeNode } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape, withZ } from './defs.ts';
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

export const randomNodeDef = defineComputeNode<RandomShape>({
  type: 'rng',
  name: 'Random',
  icon: 'ph--dice-six--regular',
  group: 'Inputs',
  schema: withZ(RandomShape),
  component: RandomComponent,
  create: createRandom,
  ports: (shape) => createPorts(shape.size, { [createAnchorId('output')]: { x: 1, y: 0 } }),
});
