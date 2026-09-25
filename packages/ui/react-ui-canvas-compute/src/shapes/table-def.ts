//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { createInputSchema, createOutputSchema } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { Message } from '@dxos/types';

import { createFunctionAnchors } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape } from './defs.ts';
import { TableComponent } from './Table.tsx';

// Kept out of `Table.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

const InputSchema = createInputSchema(Type.getSchema(Message.Message));

const OutputSchema = createOutputSchema(Schema.mutable(Schema.Array(Type.getSchema(Message.Message))));

export const TableShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('table'),
  }),
);

export type TableShape = Schema.Schema.Type<typeof TableShape>;

export type CreateTableProps = CreateShapeProps<TableShape>;

export const createTable = (props: CreateTableProps) =>
  createShape<TableShape>({ type: 'table', size: { width: 320, height: 512 }, ...props });

export const tableShape: ShapeDef<TableShape> = {
  type: 'table',
  name: 'Table',
  icon: 'ph--table--regular',
  component: TableComponent,
  createShape: createTable,
  getAnchors: (shape) => createFunctionAnchors(shape, InputSchema, OutputSchema),
  resizable: true,
};
