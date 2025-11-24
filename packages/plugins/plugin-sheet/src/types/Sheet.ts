//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { addressFromA1Notation, isFormula } from '@dxos/compute';
import { Annotation, Obj, Type } from '@dxos/echo';

import { addressToIndex, initialize, mapFormulaRefsToIndices } from './util';

export type SheetSize = {
  rows: number;
  columns: number;
};

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
export const Sheet = Schema.Struct({
  name: Schema.optional(Schema.String),

  // Sparse map of cells referenced by index.
  cells: Schema.Record({ key: Schema.String, value: Schema.mutable(CellValue) }).pipe(
    Schema.mutable,
    Annotation.FormInputAnnotation.set(false),
  ),

  // Ordered row indices.
  rows: Schema.Array(Schema.String).pipe(Schema.mutable, Annotation.FormInputAnnotation.set(false)),

  // Ordered column indices.
  columns: Schema.Array(Schema.String).pipe(Schema.mutable, Annotation.FormInputAnnotation.set(false)),

  // Row metadata referenced by index.
  rowMeta: Schema.Record({ key: Schema.String, value: Schema.mutable(RowColumnMeta) }).pipe(
    Schema.mutable,
    Annotation.FormInputAnnotation.set(false),
  ),

  // Column metadata referenced by index.
  columnMeta: Schema.Record({ key: Schema.String, value: Schema.mutable(RowColumnMeta) }).pipe(
    Schema.mutable,
    Annotation.FormInputAnnotation.set(false),
  ),

  // Cell formatting referenced by indexed range.
  ranges: Schema.Array(Range).pipe(Schema.mutable, Annotation.FormInputAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Sheet',
    version: '0.1.0',
  }),
);

export interface Sheet extends Schema.Schema.Type<typeof Sheet> {}

export type SheetProps = {
  name?: string;
  cells?: Record<string, CellValue>;
} & Partial<SheetSize>;

export const make = ({ name, cells = {}, ...size }: SheetProps = {}) => {
  const sheet = Obj.make(Sheet, { name, cells: {}, rows: [], columns: [], rowMeta: {}, columnMeta: {}, ranges: [] });

  initialize(sheet, size);

  if (cells) {
    Object.entries(cells).forEach(([key, { value }]) => {
      const idx = addressToIndex(sheet, addressFromA1Notation(key));
      if (isFormula(value)) {
        value = mapFormulaRefsToIndices(sheet, value);
      }

      sheet.cells[idx] = { value };
    });
  }

  return sheet;
};
