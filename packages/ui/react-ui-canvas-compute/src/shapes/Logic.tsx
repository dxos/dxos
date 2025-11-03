//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { IfElseInput, IfElseOutput, IfInput, IfOutput } from '@dxos/conductor';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { FunctionBody, createFunctionAnchors, getHeight } from './common';
import { ComputeShape, type CreateShapeProps, createShape } from './defs';

//
// Data
//

export const IfShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('if'),
  }),
);

export type IfShape = Schema.Schema.Type<typeof IfShape>;

export const IfElseShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('if-else'),
  }),
);

export type IfElseShape = Schema.Schema.Type<typeof IfElseShape>;

//
// Components
//

export type IfComponentProps = ShapeComponentProps<IfShape>;

export const IfComponent = ({ shape, ...props }: IfComponentProps) => (
  <FunctionBody shape={shape} inputSchema={IfInput} outputSchema={IfOutput} />
);

export type IfElseComponentProps = ShapeComponentProps<IfElseShape>;

export const IfElseComponent = ({ shape, ...props }: IfElseComponentProps) => (
  <FunctionBody shape={shape} inputSchema={IfElseInput} outputSchema={IfElseOutput} />
);

//
// Defs
//

export type CreateIfProps = CreateShapeProps<IfShape> & { if?: string };

export const createIf = (props: CreateIfProps) =>
  createShape<IfShape>({ type: 'if', size: { width: 192, height: getHeight(IfInput) }, ...props });

export const ifShape: ShapeDef<IfShape> = {
  type: 'if',
  name: 'IF',
  icon: 'ph--arrows-split--regular',
  component: (props) => <IfComponent {...props} />,
  createShape: createIf,
  getAnchors: (shape) => createFunctionAnchors(shape, IfInput, IfOutput),
};

export type CreateIfElseProps = CreateShapeProps<IfShape> & { if?: string };

export const createIfElse = (props: CreateIfElseProps) =>
  createShape<IfElseShape>({ type: 'if-else', size: { width: 192, height: getHeight(IfElseInput) }, ...props });

export const ifElseShape: ShapeDef<IfElseShape> = {
  type: 'if-else',
  name: 'IF/ELSE',
  icon: 'ph--arrows-merge--regular',
  component: (props) => <IfElseComponent {...props} />,
  createShape: createIfElse,
  getAnchors: (shape) => createFunctionAnchors(shape, IfElseInput, IfElseOutput),
};
