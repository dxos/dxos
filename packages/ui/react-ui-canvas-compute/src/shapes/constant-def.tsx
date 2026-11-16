//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React from 'react';

import { MAJOR_GRID } from '@dxos/scene';

import { createPorts, defineComputeNode } from './common/index.ts';
import { ConstantComponent } from './Constant.tsx';
import { ComputeShape, type CreateShapeProps, computeData, createAnchorId, createShape, withZ } from './defs.ts';

// Kept out of `Constant.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

//
// Data
//

export const ConstantShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('constant'),
    data: computeData({ value: Schema.optional(Schema.Any) }),
  }),
);

export type ConstantShape = Schema.Schema.Type<typeof ConstantShape>;

//
// Defs
//

export type CreateConstantProps = CreateShapeProps<ConstantShape>;

export const createConstant = (props: CreateConstantProps) =>
  createShape<ConstantShape>({ type: 'constant', size: { width: 3 * MAJOR_GRID, height: 2 * MAJOR_GRID }, ...props });

export const constantNodeDef = defineComputeNode<ConstantShape>({
  type: 'constant',
  name: 'Value',
  icon: 'ph--dots-three-circle--regular',
  group: 'Inputs',
  schema: withZ(ConstantShape),
  component: (props) => <ConstantComponent {...props} placeholder={'Constant'} />,
  create: createConstant,
  ports: (shape) => createPorts(shape.size, { [createAnchorId('output')]: { x: 1, y: 0 } }),
  resizable: true,
});
