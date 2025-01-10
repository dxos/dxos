//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { createFunctionAnchors } from './Function';
import { Box } from './components';
import { ComputeShape, createInputSchema, createOutputSchema, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { GptMessage, List } from '../graph';

const InputSchema = createInputSchema(GptMessage);
const OutputSchema = createOutputSchema(S.mutable(S.Array(GptMessage)));

export const TableShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('table'),
  }),
);

export type TableShape = ComputeShape<S.Schema.Type<typeof TableShape>, List<any>>;

export type CreateTableProps = CreateShapeProps<TableShape>;

export const createTable = ({ id, ...rest }: CreateTableProps): TableShape => ({
  id,
  type: 'table',
  node: new List(GptMessage),
  size: { width: 320, height: 512 },
  ...rest,
});

export const TableComponent = ({ shape }: ShapeComponentProps<TableShape>) => {
  const items = shape.node.items.value;
  return <Box name={'Table'}></Box>;
};

export const tableShape: ShapeDef<TableShape> = {
  type: 'table',
  icon: 'ph--table--regular',
  component: TableComponent,
  createShape: createTable,
  getAnchors: (shape) => createFunctionAnchors(shape, InputSchema, OutputSchema),
};
