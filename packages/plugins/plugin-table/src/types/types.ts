//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { TypeInputOptionsAnnotation } from '@dxos/plugin-space/types';
import { SpaceSchema } from '@dxos/react-client/echo';
import { Table } from '@dxos/react-ui-table/types';
import { View } from '@dxos/schema';

import { meta } from '../meta';

export const CreateTableSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): This should be a query input instead.
  typename: Schema.String.pipe(
    Schema.annotations({ title: 'Select type' }),
    TypeInputOptionsAnnotation.set({
      location: ['database', 'runtime'],
      kind: ['user'],
      registered: ['registered'],
    }),
    Schema.optional,
  ),
});

export type CreateTableType = Schema.Schema.Type<typeof CreateTableSchema>;

const TABLE_OPERATION = `${meta.id}/operation`;

export namespace TableOperation {
  export const OnCreateSpace = Operation.make({
    meta: { key: `${TABLE_OPERATION}/on-create-space`, name: 'On Create Space' },
    schema: {
      input: Schema.Struct({
        space: SpaceSchema,
      }),
      output: Schema.Void,
    },
  });

  export const OnSchemaAdded = Operation.make({
    meta: { key: `${TABLE_OPERATION}/on-schema-added`, name: 'On Schema Added' },
    schema: {
      input: Schema.Struct({
        db: Database.Database,
        schema: Schema.Any,
        show: Schema.optional(Schema.Boolean),
      }),
      output: Schema.Void,
    },
  });

  export const Create = Operation.make({
    meta: { key: `${TABLE_OPERATION}/create`, name: 'Create Table' },
    schema: {
      input: Schema.extend(
        Schema.Struct({
          db: Database.Database,
        }),
        CreateTableSchema,
      ),
      output: Schema.Struct({
        object: Table.Table,
      }),
    },
  });

  // TODO(wittjosiah): This appears to be unused.
  export const AddRow = Operation.make({
    meta: { key: `${TABLE_OPERATION}/add-row`, name: 'Add Row' },
    schema: {
      input: Schema.Struct({
        view: View.View,
        data: Schema.Any,
      }),
      output: Schema.Void,
    },
  });
}
