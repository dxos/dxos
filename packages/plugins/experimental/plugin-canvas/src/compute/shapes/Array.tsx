//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { ReducerInput, ReducerOutput } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';

import { createFunctionAnchors, FunctionBody, getHeight } from './Function';
import { ComputeShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';

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
// Components
//

export type ReduceComponentProps = ShapeComponentProps<ReduceShape>;

export const ReduceComponent = ({ shape }: ReduceComponentProps) => {
  return <FunctionBody shape={shape} inputSchema={ReducerInput} outputSchema={ReducerOutput} />;
};

//
// Defs
//

export type CreateReduceProps = CreateShapeProps<ReduceShape> & { reduce?: string };

export const createReduce = ({
  id,
  size = { width: 192, height: getHeight(ReducerInput) },
  ...rest
}: CreateReduceProps): ReduceShape => ({
  id,
  type: 'reduce',
  size,
  ...rest,
});

export const reduceShape: ShapeDef<ReduceShape> = {
  type: 'reduce',
  name: 'Reducer',
  icon: 'ph--repeat--regular',
  component: (props) => <ReduceComponent {...props} />,
  createShape: createReduce,
  getAnchors: (shape) => createFunctionAnchors(shape, ReducerInput, ReducerOutput),
};
