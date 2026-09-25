//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { ReducerInput, ReducerOutput } from '@dxos/conductor';
import { type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { ReducerComponent } from './Array.tsx';
import { createFunctionAnchors, getHeight } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape } from './defs.ts';

// Kept out of `Array.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

//
// Data
//

export const ReducerShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('reducer'),
  }),
);

export type ReducerShape = Schema.Schema.Type<typeof ReducerShape>;

//
// Defs
//

export type CreateReduceProps = CreateShapeProps<ReducerShape> & { reduce?: string };

export const createReducer = ({
  id,
  size = { width: 192, height: getHeight(ReducerInput) },
  ...rest
}: CreateReduceProps): ReducerShape =>
  createShape<ReducerShape>({
    type: 'reducer',
    size,
    ...rest,
  });

export const reducerShape: ShapeDef<ReducerShape> = {
  type: 'reducer',
  name: 'Reducer',
  icon: 'ph--repeat--regular',
  component: ReducerComponent,
  createShape: createReducer,
  getAnchors: (shape) => createFunctionAnchors(shape, ReducerInput, ReducerOutput),
};
