//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { AppendInput } from '../graph';
import { Box } from './components';
import { ComputeShape, type CreateShapeProps } from './defs';
import { createFunctionAnchors } from './Function';

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
  size: { width: 128, height: 64 },
  ...rest,
});

export const AppendComponent = ({ shape }: ShapeComponentProps<AppendShape>) => {
  return <Box name={'Append'}></Box>;
};

export const appendShape: ShapeDef<AppendShape> = {
  type: 'append',
  icon: 'ph--image--regular',
  component: AppendComponent,
  createShape: createAppend,
  getAnchors: (shape) => createFunctionAnchors(shape, AppendInput, S.Struct({})),
};
