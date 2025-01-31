//
// Copyright 2023 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

export const CellValue = S.Struct({
  // TODO(burdon): How to store dates (datetime, date, time), percentages, etc.
  //  Consider import/export; natural access for other plugins. Special handling for currency (precision).
  // TODO(burdon): Automerge (long string) or short string or number.
  value: S.Any,
});

export type CellValue = S.Schema.Type<typeof CellValue>;

// TODO(burdon): IMPORTANT: Reconcile with Field definition.
export const Range = S.Struct({
  range: S.String,
  key: S.String,
  value: S.String,
});

export type Range = S.Schema.Type<typeof Range>;

// TODO(burdon): Visibility, locked, frozen, etc.
export const RowColumnMeta = S.Struct({
  size: S.optional(S.Number),
});

// TODO(burdon): Reconcile col/column (across packages).
// TODO(burdon): Index to all updates when rows/columns are inserted/deleted.
export class SheetType extends TypedObject({ typename: 'dxos.org/type/Sheet', version: '0.1.0' })({
  name: S.optional(S.String),

  // Sparse map of cells referenced by index.
  cells: S.mutable(S.Record({ key: S.String, value: S.mutable(CellValue) })),

  // Ordered row indices.
  rows: S.mutable(S.Array(S.String)),

  // Ordered column indices.
  columns: S.mutable(S.Array(S.String)),

  // Row metadata referenced by index.
  rowMeta: S.mutable(S.Record({ key: S.String, value: S.mutable(RowColumnMeta) })),

  // Column metadata referenced by index.
  columnMeta: S.mutable(S.Record({ key: S.String, value: S.mutable(RowColumnMeta) })),

  // Cell formatting referenced by indexed range.
  ranges: S.mutable(S.Array(Range)),
}) {}
