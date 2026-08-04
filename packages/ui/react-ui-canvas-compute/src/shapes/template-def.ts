//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ComputeValueType, TemplateOutput, VoidInput } from '@dxos/conductor';
import { type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { createFunctionAnchors } from './common';
import { ComputeShape, type CreateShapeProps, createShape } from './defs';
import { TemplateComponent } from './Template';

// Kept out of `Template.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

//
// Data
//

export const TemplateShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
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
