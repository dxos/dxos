//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { ComputeValueType, TemplateOutput, VoidInput } from '@dxos/conductor';
import { type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { createFunctionAnchors } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape } from './defs.ts';
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

export const templateShape: ShapeDef<TemplateShape> = {
  type: 'template',
  name: 'Template',
  icon: 'ph--article--regular',
  component: TemplateComponent,
  createShape: createTemplate,
  getAnchors: (shape) => createFunctionAnchors(shape, VoidInput, TemplateOutput),
  resizable: true,
};
