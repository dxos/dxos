//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Format, Type, View } from '@dxos/echo';
import * as SpaceForm from '@dxos/plugin-space/SpaceForm';
import { Table } from '@dxos/react-ui-table/types';

export const CreateTableSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotate({ title: 'Select type' }),
    SpaceForm.TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
    }),
  ),
});

export type CreateTableType = Schema.Schema.Type<typeof CreateTableSchema>;

export const OnTypeAdded = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.table.handleTypeAdded'),
    name: 'On Type Added',
    icon: 'ph--table--regular',
  },
  input: Schema.Struct({
    db: Database.Database,
    type: Schema.Any,
    show: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
});

export const Create = Operation.make({
  meta: { key: DXN.make('org.dxos.operation.table.create'), name: 'Create Table', icon: 'ph--table--regular' },
  input: Schema.Struct({
    db: Database.Database,
  }).mapFields(Struct.assign(CreateTableSchema.fields)),
  output: Schema.Struct({
    object: Type.getSchema(Table.Table),
  }),
});

// TODO(wittjosiah): This appears to be unused.
export const AddRow = Operation.make({
  meta: { key: DXN.make('org.dxos.operation.table.addRow'), name: 'Add Row', icon: 'ph--plus--regular' },
  input: Schema.Struct({
    view: Type.getSchema(View.View),
    data: Schema.Any,
  }),
  output: Schema.Void,
});

export const ExportColumnSchema = Schema.Struct({
  path: Schema.Any,
  title: Schema.String,
  // `Format.TypeEnum`/`Format.TypeFormat` are string enums; encoding them as plain Number/String
  // would diverge from the `ExportColumn` consumer type and reject the values the table projection emits.
  type: Schema.optional(Schema.Enum(Format.TypeEnum)),
  format: Schema.optional(Schema.Enum(Format.TypeFormat)),
  referencePath: Schema.optional(Schema.Any),
});

export const ExportRows = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.table.exportRows'),
    name: 'Export Rows',
    description: 'Exports table rows as CSV, JSON (.dx.json), or XML.',
    icon: 'ph--export--regular',
  },
  input: Schema.Struct({
    format: Schema.Literals(['csv', 'json', 'xml']),
    rows: Schema.Array(Schema.Any),
    columns: Schema.Array(ExportColumnSchema),
  }),
  output: Schema.Struct({
    content: Schema.String,
    mimeType: Schema.String,
    filename: Schema.String,
  }),
});
