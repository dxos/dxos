//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { AppendInput } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';

import { createFunctionAnchors, FunctionBody, getHeight } from './Function';
import { ComputeShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';

export const AppendShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('append'),
  }),
);

export type AppendShape = S.Schema.Type<typeof AppendShape>;

export type CreateAppendProps = CreateShapeProps<AppendShape>;

export const createAppend = ({ id, ...rest }: CreateAppendProps): AppendShape => ({
  id,
  type: 'append',
  size: { width: 128, height: getHeight(AppendInput) },
  ...rest,
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
