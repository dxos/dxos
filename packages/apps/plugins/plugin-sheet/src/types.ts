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
import { create, S, TypedObject } from '@dxos/echo-schema';

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

// TODO(burdon): Normalize types.

export type CellScalar = number | string | boolean | null;

export const CellValue = S.Struct({
  // TODO(burdon): How to store dates (datetime, date, time), percentages, etc.
  //  Consider import/export; natural access for other plugins. Special handling for currency (precision).
  // TODO(burdon): Automerge (long string) or short string or number.
  value: S.Any,
});

export type CellValue = S.Schema.Type<typeof CellValue>;

/**
 * https://www.tutorialsteacher.com/typescript/typescript-number
 */
export enum ValueFormatEnum {
  // Numbers.
  Number = 0,
  Boolean = 1,

  // Special numbers.
  Percent = 10,
  Currency = 11,

  // Dates.
  DateTime = 20,
  Date = 21,
  Time = 22,

  // Validated string types.
  // TODO(burdon): Define effect types.
  URL = 100,
  DID = 101,
}

export const ValueFormat = S.Enums(ValueFormatEnum);

export const Formatting = S.Struct({
  type: S.optional(ValueFormat),
  format: S.optional(S.String),
  precision: S.optional(S.Number),
  classNames: S.optional(S.Array(S.String)),
});

export type Formatting = S.Schema.Type<typeof Formatting>;

// TODO(burdon): Visibility, locked, frozen, etc.
export const RowColumnMeta = S.Struct({
  size: S.optional(S.Number),
});

// TODO(burdon): Index to all updates when rows/columns are inserted/deleted.
export class SheetType extends TypedObject({ typename: 'dxos.org/type/SheetType', version: '0.1.0' })({
  title: S.optional(S.String),

  // Sparse map of cells referenced by index.
  cells: S.mutable(S.Record(S.String, S.mutable(CellValue))),

  // Ordered row indices.
  rows: S.mutable(S.Array(S.String)),

  // Ordered column indices.
  columns: S.mutable(S.Array(S.String)),

  // Row metadata referenced by index.
  rowMeta: S.mutable(S.Record(S.String, S.mutable(RowColumnMeta))),

  // Column metadata referenced by index.
  columnMeta: S.mutable(S.Record(S.String, S.mutable(RowColumnMeta))),

  // Cell formatting referenced by indexed range.
  formatting: S.mutable(S.Record(S.String, S.mutable(Formatting))),
}) {}

// TODO(burdon): Fix defaults.
export const createSheet = (title?: string): SheetType =>
  create(SheetType, { title, cells: {}, rows: [], columns: [], rowMeta: {}, columnMeta: {}, formatting: {} });
