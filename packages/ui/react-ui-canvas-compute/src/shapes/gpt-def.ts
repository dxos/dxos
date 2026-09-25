//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { GptInput, GptOutput } from '@dxos/conductor';
import { type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { createFunctionAnchors, getHeight } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape } from './defs.ts';
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

export const gptShape: ShapeDef<GptShape> = {
  type: 'gpt',
  name: 'GPT',
  icon: 'ph--brain--regular',
  component: GptComponent,
  createShape: createGpt,
  getAnchors: (shape) => createFunctionAnchors(shape, GptInput, GptOutput),
  openable: true,
};
