//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { AppendInput } from '@dxos/conductor';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { FunctionBody, createFunctionAnchors, getHeight } from './common';
import { ComputeShape, type CreateShapeProps, createShape } from './defs';

export const AppendShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('append'),
  }),
);

export type AppendShape = Schema.Schema.Type<typeof AppendShape>;

export type CreateAppendProps = CreateShapeProps<AppendShape>;

export const createAppend = (props: CreateAppendProps) =>
  createShape<AppendShape>({
    type: 'append',
    size: { width: 128, height: getHeight(AppendInput) },
    ...props,
  });

export const AppendComponent = ({ shape }: ShapeComponentProps<AppendShape>) => {
  return <FunctionBody shape={shape} inputSchema={AppendInput} />;
};

export const appendShape: ShapeDef<AppendShape> = {
  type: 'append',
  name: 'Append',
  icon: 'ph--list-plus--regular',
  component: AppendComponent,
  createShape: createAppend,
  getAnchors: (shape) => createFunctionAnchors(shape, AppendInput),
};
