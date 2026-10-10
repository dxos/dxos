//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { AppendInput } from '@dxos/conductor';

import { AppendComponent } from './Append.tsx';
import { createFunctionPorts, defineComputeNode, getHeight } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape, withZ } from './defs.ts';

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

export const appendNodeDef = defineComputeNode<AppendShape>({
  type: 'append',
  name: 'Append',
  icon: 'ph--list-plus--regular',
  group: 'Transform',
  schema: withZ(AppendShape),
  component: AppendComponent,
  create: createAppend,
  ports: (shape) => createFunctionPorts(shape.size, AppendInput),
});
