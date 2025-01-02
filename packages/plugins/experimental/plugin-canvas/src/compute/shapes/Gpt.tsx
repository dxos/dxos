//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { AST, S } from '@dxos/echo-schema';

import { FunctionBody, getAnchors, getHeight } from './Function';
import { ComputeShape } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { Function } from '../graph';

export const GptShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('gpt'),
  }),
);

export const GptInput = S.Struct({
  systemPrompt: S.String,
  prompt: S.String,
  history: S.Array(
    S.Struct({
      role: S.Union(S.Literal('system'), S.Literal('user'), S.Literal('assistant')),
      text: S.String,
    }),
  ),
});

export const GptOutput = S.Struct({
  result: S.String,
  tokens: S.Number,
});

export type GptInput = S.Schema.Type<typeof GptInput>;
export type GptOutput = S.Schema.Type<typeof GptOutput>;

export type GptShape = ComputeShape<S.Schema.Type<typeof GptShape>, Function<GptInput, GptOutput>>;

export type CreateGptProps = Omit<GptShape, 'type' | 'node' | 'size'>;

export const createGpt = ({ id, ...rest }: CreateGptProps): GptShape => {
  return {
    id,
    type: 'gpt',
    node: new Function(GptInput, GptOutput),
    size: { width: 192, height: getHeight(GptInput) },
    ...rest,
  };
};

export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {
  const inputs = AST.getPropertySignatures(shape.node.inputSchema.ast).map(({ name }) => name.toString());
  return <FunctionBody name={shape.node.name} inputs={inputs} />;
};

export const gptShape: ShapeDef<GptShape> = {
  type: 'gpt',
  icon: 'ph--brain--regular',
  component: GptComponent,
  createShape: createGpt,
  getAnchors: (shape) => getAnchors(shape, shape.node.inputSchema, shape.node.outputSchema),
};
