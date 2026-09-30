//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { type ShapeDef, createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { BeaconComponent } from './Beacon.tsx';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs.ts';

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

export const beaconShape: ShapeDef<BeaconShape> = {
  type: 'beacon',
  name: 'Beacon',
  icon: 'ph--sun--regular',
  component: BeaconComponent,
  createShape: createBeacon,
  getAnchors: (shape) =>
    createAnchorMap(shape, {
      [createAnchorId('input')]: { x: -1, y: 0 },
    }),
};
