//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { MAJOR_GRID } from '@dxos/scene';

import { createPorts, defineComputeNode } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape, withZ } from './defs.ts';
import { TextComponent } from './Text.tsx';

// Kept out of `Text.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const TextShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('text'),
  }),
);

export type TextShape = Schema.Schema.Type<typeof TextShape>;

export type CreateTextProps = CreateShapeProps<TextShape>;

export const createText = (props: CreateTextProps) =>
  createShape<TextShape>({ type: 'text', size: { width: 6 * MAJOR_GRID, height: 6 * MAJOR_GRID }, ...props });

export const textNodeDef = defineComputeNode<TextShape>({
  type: 'text',
  name: 'Text',
  icon: 'ph--article--regular',
  group: 'Outputs',
  schema: withZ(TextShape),
  component: TextComponent,
  create: createText,
  ports: (shape) => createPorts(shape.size, { [createAnchorId('input')]: { x: -1, y: 0 } }),
  resizable: true,
});
