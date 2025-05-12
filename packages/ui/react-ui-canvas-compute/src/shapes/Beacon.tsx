//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Schema } from 'effect';

import { DEFAULT_INPUT, isTruthy } from '@dxos/conductor';
import { Icon } from '@dxos/react-ui';
import { createAnchorMap, type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { mx } from '@dxos/react-ui-theme';

import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';
import { useComputeNodeState } from '../hooks';

export const BeaconShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('beacon'),
  }),
);

export type BeaconShape = Schema.Schema.Type<typeof BeaconShape>;

export type CreateBeaconProps = CreateShapeProps<BeaconShape>;

export const createBeacon = (props: CreateBeaconProps) =>
  createShape<BeaconShape>({ type: 'beacon', size: { width: 64, height: 64 }, ...props });

export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : false;

  return (
    <div className='flex w-full justify-center items-center'>
      <Icon
        icon='ph--sun--regular'
        classNames={mx('transition opacity-20 duration-1000', isTruthy(value) && 'opacity-100 text-yellow-500')}
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
