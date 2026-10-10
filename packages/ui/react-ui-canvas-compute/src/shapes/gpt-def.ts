//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { GptInput, GptOutput } from '@dxos/conductor';

import { createFunctionPorts, defineComputeNode, getHeight } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape, withZ } from './defs.ts';
import { GptComponent } from './Gpt.tsx';

// Kept out of `Gpt.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const GptShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('gpt'),
  }),
);

export type GptShape = Schema.Schema.Type<typeof GptShape>;

export type CreateGptProps = CreateShapeProps<GptShape>;

export const createGpt = (props: CreateGptProps) =>
  createShape<GptShape>({
    type: 'gpt',
    size: { width: 256, height: Math.max(getHeight(GptInput), getHeight(GptOutput)) },
    ...props,
  });

export const gptNodeDef = defineComputeNode<GptShape>({
  type: 'gpt',
  name: 'GPT',
  icon: 'ph--brain--regular',
  group: 'Transform',
  schema: withZ(GptShape),
  component: GptComponent,
  create: createGpt,
  ports: (shape) => createFunctionPorts(shape.size, GptInput, GptOutput),
  openable: true,
});
