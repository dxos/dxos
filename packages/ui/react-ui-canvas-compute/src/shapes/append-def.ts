//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { AppendInput } from '@dxos/conductor';
import { type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { AppendComponent } from './Append.tsx';
import { createFunctionAnchors, getHeight } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape } from './defs.ts';

// Kept out of `Append.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const AppendShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('append'),
  }),
);

export type AppendShape = Schema.Schema.Type<typeof AppendShape>;

export type CreateAppendProps = CreateShapeProps<AppendShape>;

export const createAppend = (props: CreateAppendProps) =>
  createShape<AppendShape>({
    type: 'append',
    size: { width: 128, height: getHeight(AppendInput) },
    ...props,
  });

export const appendShape: ShapeDef<AppendShape> = {
  type: 'append',
  name: 'Append',
  icon: 'ph--list-plus--regular',
  component: AppendComponent,
  createShape: createAppend,
  getAnchors: (shape) => createFunctionAnchors(shape, AppendInput),
};
