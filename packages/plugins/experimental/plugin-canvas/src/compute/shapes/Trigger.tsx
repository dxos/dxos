//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { TriggerInput, TriggerOutput } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';

import { createFunctionAnchors, getHeight, FunctionBody } from './common';
import { ComputeShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';

export const TriggerShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('trigger'),
  }),
);

export type TriggerShape = S.Schema.Type<typeof TriggerShape>;

export type CreateTriggerProps = CreateShapeProps<TriggerShape>;

export const createTrigger = ({ id, ...rest }: CreateTriggerProps): TriggerShape => ({
  id,
  type: 'trigger',
  size: { width: 192, height: getHeight(TriggerInput) },
  ...rest,
});

export const TriggerComponent = ({ shape }: ShapeComponentProps<TriggerShape>) => {
  return <FunctionBody shape={shape} inputSchema={TriggerInput} outputSchema={TriggerOutput} />;
};

export const triggerShape: ShapeDef<TriggerShape> = {
  type: 'trigger',
  name: 'Trigger',
  icon: 'ph--lightning--regular',
  component: TriggerComponent,
  createShape: createTrigger,
  getAnchors: (shape) => createFunctionAnchors(shape, TriggerInput, TriggerOutput),
};
