//
// Copyright 2023 DXOS.org
//

import type {
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { type SchemaProvides } from '@dxos/plugin-space';
import { SpaceSchema } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table/types';
import { FieldSchema } from '@dxos/schema';

import { TABLE_PLUGIN } from '../meta';

export namespace TableAction {
  const TABLE_ACTION = `${TABLE_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${TABLE_ACTION}/create`, {
    input: S.Struct({
      space: SpaceSchema,
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: TableType,
    }),
  }) {}

  export class DeleteColumn extends S.TaggedClass<DeleteColumn>()(`${TABLE_ACTION}/delete-column`, {
    input: S.Struct({
      table: TableType,
      fieldId: S.String,
      // TODO(wittjosiah): Separate fields for undo data?
      deletionData: S.optional(
        S.Struct({
          field: FieldSchema,
          // TODO(wittjosiah): This creates a type error.
          // props: PropertySchema,
          props: S.Any,
          index: S.Number,
        }),
      ),
    }),
    output: S.Void,
  }) {}
}

export type TableProvides = {};

export type TablePluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  SchemaProvides &
  TranslationsProvides;

export const isTable = (object: unknown): object is TableType => object != null && object instanceof TableType;
