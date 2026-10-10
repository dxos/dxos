//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { IfElseInput, IfElseOutput, IfInput, IfOutput } from '@dxos/conductor';

import { createFunctionPorts, defineComputeNode, getHeight } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape, withZ } from './defs.ts';
import { IfComponent, IfElseComponent } from './Logic.tsx';

// Kept out of `Logic.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

//
// Data
//

export const IfShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('if'),
  }),
);

export type IfShape = Schema.Schema.Type<typeof IfShape>;

export const IfElseShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('if-else'),
  }),
);

export type IfElseShape = Schema.Schema.Type<typeof IfElseShape>;

//
// Defs
//

export type CreateIfProps = CreateShapeProps<IfShape> & { if?: string };

export const createIf = (props: CreateIfProps) =>
  createShape<IfShape>({ type: 'if', size: { width: 192, height: getHeight(IfInput) }, ...props });

export const ifNodeDef = defineComputeNode<IfShape>({
  type: 'if',
  name: 'IF',
  icon: 'ph--arrows-split--regular',
  group: 'Operations',
  schema: withZ(IfShape),
  component: IfComponent,
  create: createIf,
  ports: (shape) => createFunctionPorts(shape.size, IfInput, IfOutput),
});

export type CreateIfElseProps = CreateShapeProps<IfShape> & { if?: string };

export const createIfElse = (props: CreateIfElseProps) =>
  createShape<IfElseShape>({ type: 'if-else', size: { width: 192, height: getHeight(IfElseInput) }, ...props });

export const ifElseNodeDef = defineComputeNode<IfElseShape>({
  type: 'if-else',
  name: 'IF/ELSE',
  icon: 'ph--arrows-merge--regular',
  group: 'Operations',
  schema: withZ(IfElseShape),
  component: IfElseComponent,
  create: createIfElse,
  ports: (shape) => createFunctionPorts(shape.size, IfElseInput, IfElseOutput),
});
