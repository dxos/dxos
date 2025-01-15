//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { createFunctionAnchors, FunctionBody, getHeight } from './Function';
import { ComputeShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { GptInput } from '../graph';
import { GptOutput } from '@dxos/conductor';
import { useComputeNodeState } from '../hooks';
import React from 'react';

export const GptShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('gpt'),
  }),
);

export type GptShape = S.Schema.Type<typeof GptShape>;

export type CreateGptProps = CreateShapeProps<GptShape>;

export const createGpt = ({ id, ...rest }: CreateGptProps): GptShape => {
  return {
    id,
    type: 'gpt',
    size: { width: 256, height: getHeight(GptInput) },
    ...rest,
  };
};

export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {
  const { meta } = useComputeNodeState(shape);
  return <FunctionBody name={'GPT'} inputSchema={meta.input} outputSchema={meta.output} />;
};

export const gptShape: ShapeDef<GptShape> = {
  type: 'gpt',
  icon: 'ph--brain--regular',
  component: GptComponent,
  createShape: createGpt,
  // TODO(dmaretskyi): Can we fetch the schema dynamically?
  getAnchors: (shape) => createFunctionAnchors(shape, GptInput, GptOutput),
};
