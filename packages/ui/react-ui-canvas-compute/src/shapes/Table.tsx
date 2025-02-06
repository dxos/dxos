//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { createInputSchema, createOutputSchema, GptMessage } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { createFunctionAnchors, Box } from './common';
import { ComputeShape, createShape, type CreateShapeProps } from './defs';

const InputSchema = createInputSchema(GptMessage);
const OutputSchema = createOutputSchema(S.mutable(S.Array(GptMessage)));

export const TableShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('table'),
  }),
);

export type TableShape = S.Schema.Type<typeof TableShape>;

export type CreateTableProps = CreateShapeProps<TableShape>;

export const createTable = (props: CreateTableProps) =>
  createShape<TableShape>({ type: 'table', size: { width: 320, height: 512 }, ...props });

export const TableComponent = ({ shape }: ShapeComponentProps<TableShape>) => {
  // const items = shape.node.items.value;

  return <Box shape={shape}></Box>;
};

export const tableShape: ShapeDef<TableShape> = {
  type: 'table',
  name: 'Table',
  icon: 'ph--table--regular',
  component: TableComponent,
  createShape: createTable,
  getAnchors: (shape) => createFunctionAnchors(shape, InputSchema, OutputSchema),
  resizable: true,
};
