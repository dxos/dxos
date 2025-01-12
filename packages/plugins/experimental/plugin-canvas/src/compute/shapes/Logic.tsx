//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { createFunctionAnchors, FunctionBody, getHeight } from './Function';
import { ComputeShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { If, IfElse, IfElseInput, IfElseOutput, IfInput, IfOutput } from '../graph';

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

export const IfElseShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('if-else'),
  }),
);

export type IfElseShape = ComputeShape<S.Schema.Type<typeof IfElseShape>, IfElse>;

//
// Components
//

export type IfComponentProps = ShapeComponentProps<IfShape>;

export const IfComponent = ({ shape, ...props }: IfComponentProps) => {
  return <FunctionBody name={'IF'} inputSchema={IfInput} outputSchema={IfOutput} />;
};

export type IfElseComponentProps = ShapeComponentProps<IfElseShape>;

export const IfElseComponent = ({ shape, ...props }: IfElseComponentProps) => {
  return <FunctionBody name={'IF/ELSE'} inputSchema={IfElseInput} outputSchema={IfElseOutput} />;
};

//
// Defs
//

export type CreateIfProps = CreateShapeProps<IfShape> & { if?: string };

export const createIf = ({
  id,
  size = { width: 192, height: getHeight(IfInput) },
  ...rest
}: CreateIfProps): IfShape => ({
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

export type CreateIfElseProps = CreateShapeProps<IfShape> & { if?: string };

export const createIfElse = ({
  id,
  size = { width: 192, height: getHeight(IfElseInput) },
  ...rest
}: CreateIfElseProps): IfElseShape => ({
  id,
  type: 'if-else',
  node: new IfElse(),
  size,
  ...rest,
});

export const ifElseShape: ShapeDef<IfElseShape> = {
  type: 'if-else',
  icon: 'ph--question--regular',
  component: (props) => <IfElseComponent {...props} />,
  createShape: createIfElse,
  getAnchors: (shape) => createFunctionAnchors(shape, IfElseInput, IfElseOutput),
};
