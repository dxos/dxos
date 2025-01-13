//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { ReduceInput, ReduceOutput } from '../graph';
import { createFunctionAnchors, FunctionBody, getHeight } from './Function';
import { ComputeShape, type CreateShapeProps } from './defs';

//
// Data
//

export const ReduceShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('reduce'),
  }),
);

export type ReduceShape = S.Schema.Type<typeof ReduceShape>;

//
// Data
//

export const ReduceShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('reduce'),
  }),
);

export type ReduceShape = ComputeShape<S.Schema.Type<typeof ReduceShape>, Reduce>;

//
// Components
//

export type ReduceComponentProps = ShapeComponentProps<ReduceShape>;

export const ReduceComponent = ({ shape, ...props }: ReduceComponentProps) => {
  return <FunctionBody name={'Reduce'} inputSchema={ReduceInput} outputSchema={ReduceOutput} />;
};

//
// Defs
//

export type CreateReduceProps = CreateShapeProps<ReduceShape> & { reduce?: string };

export const createReduce = ({
  id,
  size = { width: 192, height: getHeight(ReduceInput) },
  ...rest
}: CreateReduceProps): ReduceShape => ({
  id,
  type: 'reduce',
  size,
  ...rest,
});

export const reduceShape: ShapeDef<ReduceShape> = {
  type: 'reduce',
  icon: 'ph--repeat--regular',
  component: (props) => <ReduceComponent {...props} />,
  createShape: createReduce,
  getAnchors: (shape) => createFunctionAnchors(shape, ReduceInput, ReduceOutput),
};
