//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, DXN, Type, View } from '@dxos/echo';
import { TypeInputOptionsAnnotation } from '@dxos/plugin-space';
import { Table } from '@dxos/react-ui-table/types';

import { meta } from '#meta';

export const CreateTableSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotations({ title: 'Select type' }),
    TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
    }),
  ),
});

export type CreateTableType = Schema.Schema.Type<typeof CreateTableSchema>;

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const OnTypeAdded = Operation.make({
  meta: { key: makeKey('onTypeAdded'), name: 'On Type Added', icon: 'ph--table--regular' },
  input: Schema.Struct({
    db: Database.Database,
    type: Schema.Any,
    show: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
});

export const Create = Operation.make({
  meta: { key: makeKey('create'), name: 'Create Table', icon: 'ph--table--regular' },
  input: Schema.extend(
    Schema.Struct({
      db: Database.Database,
    }),
    CreateTableSchema,
  ),
  output: Schema.Struct({
    object: Type.getSchema(Table.Table),
  }),
});

// TODO(wittjosiah): This appears to be unused.
export const AddRow = Operation.make({
  meta: { key: makeKey('addRow'), name: 'Add Row', icon: 'ph--plus--regular' },
  input: Schema.Struct({
    view: Type.getSchema(View.View),
    data: Schema.Any,
  }),
  output: Schema.Void,
});
