//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { ReducerInput, ReducerOutput } from '@dxos/conductor';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { FunctionBody, createFunctionAnchors, getHeight } from './common';
import { ComputeShape, type CreateShapeProps, createShape } from './defs';

//
// Data
//

export const ReducerShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('reducer'),
  }),
);

export type ReducerShape = Schema.Schema.Type<typeof ReducerShape>;

//
// Components
//

export type ReducerComponentProps = ShapeComponentProps<ReducerShape>;

export const ReducerComponent = ({ shape }: ReducerComponentProps) => {
  return <FunctionBody shape={shape} inputSchema={ReducerInput} outputSchema={ReducerOutput} />;
};

//
// Defs
//

export type CreateReduceProps = CreateShapeProps<ReducerShape> & { reduce?: string };

export const createReducer = ({
  id,
  size = { width: 192, height: getHeight(ReducerInput) },
  ...rest
}: CreateReduceProps): ReducerShape =>
  createShape<ReducerShape>({
    type: 'reducer',
    size,
    ...rest,
  });

export const reducerShape: ShapeDef<ReducerShape> = {
  type: 'reducer',
  name: 'Reducer',
  icon: 'ph--repeat--regular',
  component: (props) => <ReducerComponent {...props} />,
  createShape: createReducer,
  getAnchors: (shape) => createFunctionAnchors(shape, ReducerInput, ReducerOutput),
};
