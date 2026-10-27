//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { ComputeValueType, TemplateOutput, VoidInput } from '@dxos/conductor';

import { createFunctionPorts, defineComputeNode } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape, withZ } from './defs.ts';
import { TemplateComponent } from './Template.tsx';

// Kept out of `Template.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

//
// Data
//

export const TemplateShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('template'),
    valueType: Schema.optional(ComputeValueType),
  }),
);

export type TemplateShape = Schema.Schema.Type<typeof TemplateShape>;

//
// Defs
//

export type CreateTemplateProps = CreateShapeProps<TemplateShape> & { text?: string };

export const createTemplate = (props: CreateTemplateProps) =>
  createShape<TemplateShape>({ type: 'template', size: { width: 256, height: 384 }, ...props });

export const templateNodeDef = defineComputeNode<TemplateShape>({
  type: 'template',
  name: 'Template',
  icon: 'ph--article--regular',
  group: 'Inputs',
  schema: withZ(TemplateShape),
  component: TemplateComponent,
  create: createTemplate,
  ports: (shape) => createFunctionPorts(shape.size, VoidInput, TemplateOutput),
  resizable: true,
});
