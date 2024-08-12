//
// Copyright 2023 DXOS.org
//

import { type SchemaProvides } from '@braneframe/plugin-client';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { S, TypedObject } from '@dxos/echo-schema';

import { GRID_PLUGIN } from './meta';

const GRID_ACTION = `${GRID_PLUGIN}/action`;

export enum GridAction {
  CREATE = `${GRID_ACTION}/create`,
}

export type GridPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;

// TODO(burdon): Add formatting.
export const CellSchema = S.Struct({
  // TODO(burdon): Automerge (long string) or short string or number.
  value: S.Any,
});

export type CellSchema = S.Schema.Type<typeof CellSchema>;

export class SheetType extends TypedObject({ typename: 'dxos.org/type/SheetType', version: '0.1.0' })({
  title: S.optional(S.String),
  // Cells indexed by A1 reference.
  // TODO(burdon): Not robust to adding rows/columns.
  cells: S.mutable(S.Record(S.String, S.mutable(CellSchema))).pipe(S.default({})),
}) {}
