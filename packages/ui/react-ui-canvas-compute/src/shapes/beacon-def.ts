//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { BeaconComponent } from './Beacon.tsx';
import { createPorts, defineComputeNode } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape, withZ } from './defs.ts';

// Kept out of `Beacon.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const BeaconShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('beacon'),
  }),
);

export type BeaconShape = Schema.Schema.Type<typeof BeaconShape>;

export type CreateBeaconProps = CreateShapeProps<BeaconShape>;

export const createBeacon = (props: CreateBeaconProps) =>
  createShape<BeaconShape>({ type: 'beacon', size: { width: 64, height: 64 }, ...props });

export const beaconNodeDef = defineComputeNode<BeaconShape>({
  type: 'beacon',
  name: 'Beacon',
  icon: 'ph--sun--regular',
  group: 'Outputs',
  schema: withZ(BeaconShape),
  component: BeaconComponent,
  create: createBeacon,
  ports: (shape) =>
    createPorts(shape.size, {
      [createAnchorId('input')]: { x: -1, y: 0 },
    }),
});
