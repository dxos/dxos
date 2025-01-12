//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { createFunctionAnchors, FunctionBody } from './Function';
import { ComputeShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { If, IfInput, IfOutput } from '../graph';

//
// Data
//

export const IfShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('if'),
  }),
);

export type IfShape = ComputeShape<S.Schema.Type<typeof IfShape>, If>;

//
// Component
//

export type IfComponentProps = ShapeComponentProps<IfShape>;

export const IfComponent = ({ shape, ...props }: IfComponentProps) => {
  return <FunctionBody name={'IF'} inputSchema={IfInput} outputSchema={IfOutput} />;
};

//
// Defs
//

export type CreateIfProps = CreateShapeProps<IfShape> & { if?: string };

export const createIf = ({ id, size = { width: 192, height: 128 }, ...rest }: CreateIfProps): IfShape => ({
  id,
  type: 'if',
  node: new If(),
  size,
  ...rest,
});

export const ifShape: ShapeDef<IfShape> = {
  type: 'if',
  icon: 'ph--question--regular',
  component: (props) => <IfComponent {...props} />,
  createShape: createIf,
  getAnchors: (shape) => createFunctionAnchors(shape, IfInput, IfOutput),
};
