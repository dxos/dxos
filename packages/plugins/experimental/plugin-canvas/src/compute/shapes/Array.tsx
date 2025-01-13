//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { createFunctionAnchors, FunctionBody, getHeight } from './Function';
import { ComputeShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { Reduce, ReduceInput, ReduceOutput } from '../graph';

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
  node: new Reduce(),
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
