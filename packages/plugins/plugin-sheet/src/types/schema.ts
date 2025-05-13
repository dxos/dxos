//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Ref, TypedObject } from '@dxos/echo-schema';
import { ThreadType } from '@dxos/plugin-space/types';

export const CellValue = Schema.Struct({
  // TODO(burdon): How to store dates (datetime, date, time), percentages, etc.
  //  Consider import/export; natural access for other plugins. Special handling for currency (precision).
  // TODO(burdon): Automerge (long string) or short string or number.
  value: Schema.Any,
});

export type CellValue = Schema.Schema.Type<typeof CellValue>;

// TODO(burdon): IMPORTANT: Reconcile with Field definition.
export const Range = Schema.Struct({
  range: Schema.String,
  key: Schema.String,
  value: Schema.String,
});

export type Range = Schema.Schema.Type<typeof Range>;

// TODO(burdon): Visibility, locked, frozen, etc.
export const RowColumnMeta = Schema.Struct({
  size: Schema.optional(Schema.Number),
});

// TODO(burdon): Reconcile col/column (across packages).
// TODO(burdon): Index to all updates when rows/columns are inserted/deleted.
export class SheetType extends TypedObject({ typename: 'dxos.org/type/Sheet', version: '0.1.0' })({
  name: Schema.optional(Schema.String),

  // Sparse map of cells referenced by index.
  cells: Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.mutable(CellValue) })),

  // Ordered row indices.
  rows: Schema.mutable(Schema.Array(Schema.String)),

  // Ordered column indices.
  columns: Schema.mutable(Schema.Array(Schema.String)),

  // Row metadata referenced by index.
  rowMeta: Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.mutable(RowColumnMeta) })),

  // Column metadata referenced by index.
  columnMeta: Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.mutable(RowColumnMeta) })),

  // Cell formatting referenced by indexed range.
  ranges: Schema.mutable(Schema.Array(Range)),

  // Threads associated with the sheet
  threads: Schema.optional(Schema.mutable(Schema.Array(Ref(ThreadType)))),
}) {}
