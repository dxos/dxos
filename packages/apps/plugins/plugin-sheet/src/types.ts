//
// Copyright 2023 DXOS.org
//

import { type SchemaProvides } from '@braneframe/plugin-client';
import type { StackProvides } from '@braneframe/plugin-stack';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { S, TypedObject } from '@dxos/echo-schema';

import { SHEET_PLUGIN } from './meta';

const SHEET_ACTION = `${SHEET_PLUGIN}/action`;

export enum SheetAction {
  CREATE = `${SHEET_ACTION}/create`,
}

export type SheetPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides &
  StackProvides;

export const CellSchema = S.Struct({
  // TODO(burdon): Automerge (long string) or short string or number.
  value: S.Any,
});

export type CellSchema = S.Schema.Type<typeof CellSchema>;

export enum CellTypeEnum {
  Number = 0,
  Boolean = 1,
  Float = 2, // TODO(burdon): Precision?

  String = 10,
  Date = 21,
  URL = 12,

  Text = 20,
  Ref = 21,
}

export const CellType = S.Enums(CellTypeEnum);

export const FormatSchema = S.Struct({
  type: S.optional(CellType),
  format: S.optional(S.String), // TODO(burdon): Precision.
  classNames: S.optional(S.Array(S.String)),
});

export type FormatSchema = S.Schema.Type<typeof FormatSchema>;

// TODO(burdon): Index to all updates when rows/columns are inserted/deleted.
export class SheetType extends TypedObject({ typename: 'dxos.org/type/SheetType', version: '0.1.0' })({
  title: S.optional(S.String),
  // Cells indexed by A1 reference.
  cells: S.mutable(S.Record(S.String, S.mutable(CellSchema))).pipe(S.default({})),
  // Format indexed by range (e.g., "A", "A1", "A1:A5").
  format: S.mutable(S.Record(S.String, S.mutable(FormatSchema))).pipe(S.default({})),
}) {}
