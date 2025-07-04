//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import React from 'react';

import { Message } from '@dxos/ai';
import { createInputSchema, createOutputSchema } from '@dxos/conductor';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { createFunctionAnchors, Box } from './common';
import { ComputeShape, createShape, type CreateShapeProps } from './defs';

const InputSchema = createInputSchema(Message);
const OutputSchema = createOutputSchema(Schema.mutable(Schema.Array(Message)));

export const TableShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('table'),
  }),
);

export type TableShape = Schema.Schema.Type<typeof TableShape>;

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
