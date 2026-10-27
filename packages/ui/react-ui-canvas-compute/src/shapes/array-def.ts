//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { ReducerInput, ReducerOutput } from '@dxos/conductor';

import { ReducerComponent } from './Array.tsx';
import { createFunctionPorts, defineComputeNode, getHeight } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape, withZ } from './defs.ts';

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
  size = { width: 192, height: getHeight(ReducerInput) },
  ...rest
}: CreateReduceProps): ReducerShape =>
  createShape<ReducerShape>({
    type: 'reducer',
    size,
    ...rest,
  });

export const reducerNodeDef = defineComputeNode<ReducerShape>({
  type: 'reducer',
  name: 'Reducer',
  icon: 'ph--repeat--regular',
  group: 'Operations',
  schema: withZ(ReducerShape),
  component: ReducerComponent,
  create: createReducer,
  ports: (shape) => createFunctionPorts(shape.size, ReducerInput, ReducerOutput),
});
