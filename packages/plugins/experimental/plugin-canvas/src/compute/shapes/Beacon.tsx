//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DEFAULT_INPUT } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';
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

export const createBeacon = (props: CreateBeaconProps) =>
  createShape<BeaconShape>({ type: 'beacon', size: { width: 64, height: 64 }, ...props });

const isFalsy = (value: any) =>
  value === false || value === null || value === undefined || (Array.isArray(value) && value.length === 0);

export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : false;

  return (
    <div className='flex w-full justify-center items-center'>
      <Icon
        icon='ph--sun--regular'
        classNames={mx('transition opacity-20 duration-1000', !isFalsy(value) && 'opacity-100 text-yellow-500')}
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
