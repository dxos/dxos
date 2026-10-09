//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { createInputSchema, createOutputSchema } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { Message } from '@dxos/types';

import { createFunctionPorts, defineComputeNode } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape, withZ } from './defs.ts';
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

export const tableNodeDef = defineComputeNode<TableShape>({
  type: 'table',
  name: 'Table',
  icon: 'ph--table--regular',
  schema: withZ(TableShape),
  component: TableComponent,
  create: createTable,
  ports: (shape) => createFunctionPorts(shape.size, InputSchema, OutputSchema),
  resizable: true,
});
