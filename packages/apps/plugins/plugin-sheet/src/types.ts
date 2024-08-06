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

export const CellValue = S.Struct({
  // TODO(burdon): Automerge (long string) or short string or number.
  value: S.Any,
});

export type CellValue = S.Schema.Type<typeof CellValue>;

export enum CellTypeEnum {
  // https://www.tutorialsteacher.com/typescript/typescript-number
  Number = 0,
  Boolean = 1,
  Float = 2,

  String = 10,
  Date = 11,
  URL = 12,

  Text = 20,
  Ref = 21,
}

export const CellType = S.Enums(CellTypeEnum);

export const Formatting = S.Struct({
  type: S.optional(CellType),
  precision: S.optional(S.Number),
  format: S.optional(S.String),
  styles: S.optional(S.Array(S.String)),
});

export type Formatting = S.Schema.Type<typeof Formatting>;

// TODO(burdon): Index to all updates when rows/columns are inserted/deleted.
export class SheetType extends TypedObject({ typename: 'dxos.org/type/SheetType', version: '0.1.0' })({
  title: S.optional(S.String),
  // Cells indexed by A1 reference.
  cells: S.mutable(S.Record(S.String, S.mutable(CellValue))).pipe(S.default({})),
  // Format indexed by range (e.g., "A", "A1", "A1:A5").
  formatting: S.mutable(S.Record(S.String, S.mutable(Formatting))).pipe(S.default({})),
}) {}
