//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { ComputeShape, createAnchorId, createComputeShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorMap } from '../../components';
import { useComputeShapeState } from '../../hooks';

export const CounterShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('counter'),
  }),
);

export type CounterShape = S.Schema.Type<typeof CounterShape>;

export type CreateCounterProps = CreateShapeProps<CounterShape>;

export const createCounter = ({ id, ...rest }: CreateCounterProps): CounterShape => ({
  id,
  type: 'counter',
  size: { width: 64, height: 64 },
  ...rest,
});

export const CounterComponent = ({ shape }: ShapeComponentProps<CounterShape>) => {
  const { runtime } = useComputeShapeState(shape);
  const output = runtime?.outputs.value;
  const value = output?.type === 'executed' ? output.value : 0;

  return <div className='flex w-full justify-center items-center'>{value}</div>;
};

export const counterShape: ShapeDef<CounterShape> = {
  type: 'counter',
  icon: 'ph--calculator--regular',
  component: CounterComponent,
  createShape: createCounter,
  getAnchors: (shape) =>
    createAnchorMap(shape, {
      [createAnchorId('input')]: { x: -1, y: 0 },
      [createAnchorId('output')]: { x: 1, y: 0 },
    }),
};
