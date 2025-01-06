//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { ComputeShape, type CreateShapeProps } from './defs';
import { createAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorId } from '../../shapes';
import { Counter } from '../graph';

export const CounterShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('counter'),
  }),
);

export type CounterShape = ComputeShape<S.Schema.Type<typeof CounterShape>, Counter>;

export type CreateCounterProps = CreateShapeProps<CounterShape>;

export const createCounter = ({ id, ...rest }: CreateCounterProps): CounterShape => ({
  id,
  type: 'counter',
  node: new Counter(),
  size: { width: 64, height: 64 },
  ...rest,
});

export const CounterComponent = ({ shape }: ShapeComponentProps<CounterShape>) => {
  const value = shape.node.state.value;

  return <div className='flex w-full justify-center items-center'>{value}</div>;
};

export const counterShape: ShapeDef<CounterShape> = {
  type: 'counter',
  icon: 'ph--calculator--regular',
  component: CounterComponent,
  createShape: createCounter,
  getAnchors: (shape) =>
    createAnchors(shape, {
      [createAnchorId('input')]: { x: -1, y: 0 },
      [createAnchorId('output')]: { x: 1, y: 0 },
    }),
};
