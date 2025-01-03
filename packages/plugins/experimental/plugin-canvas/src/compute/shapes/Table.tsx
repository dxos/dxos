//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { getAnchors } from './Function';
import { GptMessage } from './Gpt';
import { Box } from './common';
import { ComputeShape, createInputSchema, createOutputSchema } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { List } from '../graph';

const InputSchema = createInputSchema(GptMessage);
const OutputSchema = createOutputSchema(S.mutable(S.Array(GptMessage)));

export const TableShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('table'),
  }),
);

export type TableShape = ComputeShape<S.Schema.Type<typeof TableShape>, List<any, any>>;

export type CreateTableProps = Omit<TableShape, 'type' | 'node' | 'size'>;

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
  getAnchors: (shape) => getAnchors(shape, InputSchema, OutputSchema),
};

// export const Node = <T extends S.Schema.AnyNoContext>(properties: T) =>
//   S.Struct({
//     id: S.String,
//     properties,
//   });
//
// const FunctionNode = Node(
//   S.Struct({
//     name: S.String,
//   }),
// );
//
// const AnyNode = Node(S.Any);
