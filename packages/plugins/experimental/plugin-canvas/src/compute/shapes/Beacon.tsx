//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';
import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorMap } from '../../components';
import { Beacon } from '../graph';

export const BeaconShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('beacon'),
  }),
);

export type BeaconShape = ComputeShape<S.Schema.Type<typeof BeaconShape>, Beacon>;

export type CreateBeaconProps = CreateShapeProps<BeaconShape>;

export const createBeacon = ({ id, ...rest }: CreateBeaconProps): BeaconShape => ({
  id,
  type: 'beacon',
  node: new Beacon(),
  size: { width: 64, height: 64 },
  ...rest,
});

export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) => {
  // Signals value.
  const value = shape.node.state.value;

  return (
    <div className='flex w-full justify-center items-center'>
      <Icon
        icon='ph--sun--regular'
        classNames={mx('transition opacity-20 duration-1000', value && 'opacity-100 text-yellow-500')}
        size={8}
      />
    </div>
  );
};

export const beaconShape: ShapeDef<BeaconShape> = {
  type: 'beacon',
  icon: 'ph--sun--regular',
  component: BeaconComponent,
  createShape: createBeacon,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('input')]: { x: -1, y: 0 } }),
};
