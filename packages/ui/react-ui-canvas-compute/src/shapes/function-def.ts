//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { AnyOutput, FunctionInput } from '@dxos/conductor';
import { type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { createFunctionAnchors } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape } from './defs.ts';
import { FunctionShapeComponent } from './Function.tsx';

// Kept out of `Function.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const FunctionShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('function'),
  }),
);

export type FunctionShape = Schema.Schema.Type<typeof FunctionShape>;

export type CreateFunctionProps = CreateShapeProps<FunctionShape>;

export const createFunction = (props: CreateFunctionProps) =>
  createShape<FunctionShape>({
    type: 'function',
    size: { width: 256, height: 192 },
    ...props,
  });

//
// Defs
//

export const functionShape: ShapeDef<FunctionShape> = {
  type: 'function',
  name: 'Function',
  icon: 'ph--function--regular',
  component: FunctionShapeComponent,
  createShape: createFunction,
  getAnchors: (shape) => createFunctionAnchors(shape, FunctionInput, AnyOutput),
};
