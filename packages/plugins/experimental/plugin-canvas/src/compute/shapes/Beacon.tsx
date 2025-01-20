//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DEFAULT_INPUT } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { createAnchorMap, type ShapeComponentProps, type ShapeDef } from '../../components';
import { useComputeNodeState } from '../hooks';

export const BeaconShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('beacon'),
  }),
);

export type BeaconShape = S.Schema.Type<typeof BeaconShape>;

export type CreateBeaconProps = CreateShapeProps<BeaconShape>;

export const createBeacon = ({ id, ...rest }: CreateBeaconProps): BeaconShape => ({
  id,
  type: 'beacon',
  size: { width: 64, height: 64 },
  ...rest,
});

export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : 0;

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
  name: 'Beacon',
  icon: 'ph--sun--regular',
  component: BeaconComponent,
  createShape: createBeacon,
  getAnchors: (shape) =>
    createAnchorMap(shape, {
      [createAnchorId('input')]: { x: -1, y: 0 },
    }),
};
