//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';
import { Icon } from '@dxos/react-ui';

import { BaseComputeShape, type BaseComputeShapeProps } from './defs';
import { createAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { Beacon } from '../graph';

export const BeaconShape = S.extend(
  BaseComputeShape,
  S.Struct({
    type: S.Literal('beacon'),
  }),
);

export type BeaconShape = S.Schema.Type<typeof BeaconShape>;

export type CreateBeaconProps = Omit<BaseComputeShapeProps<Beacon>, 'size'>;

export const createBeacon = ({ id, ...rest }: CreateBeaconProps): BeaconShape => ({
  id,
  type: 'beacon',
  node: new Beacon(),
  size: { width: 64, height: 64 },
  ...rest,
});

export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) => {
  return (
    <div className='flex w-full justify-center items-center'>
      <Icon icon='ph--sun--regular' size={6} />
    </div>
  );
};

export const beaconShape: ShapeDef<BeaconShape> = {
  type: 'beacon',
  icon: 'ph--sun--regular',
  component: BeaconComponent,
  createShape: createBeacon,
  getAnchors: (shape) => createAnchors(shape, { 'input.value': { x: -1, y: 0 } }),
};
