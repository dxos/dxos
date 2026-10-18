//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { addressFromA1Notation, isFormula, rangeFromA1Notation } from '@dxos/compute-hyperformula/types';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Collection, DXN, Obj, Type } from '@dxos/echo';

import { addressToIndex, initialize, mapFormulaRefsToIndices, rangeToIndex } from './SheetUtil.ts';

export const SKILL_KEY = 'org.dxos.skill.sheet';

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

export const ChartType = Schema.Literals(['bar', 'pie', 'xy']);
export type ChartType = Schema.Schema.Type<typeof ChartType>;

/** A chart of a 2D range; the first column is the category (bar, pie) or x axis (xy), each other column a series. */
export const Chart = Schema.Struct({
  id: Schema.String.pipe(Annotation.FormInputAnnotation.set(false)),
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
  // TODO(burdon): Store as an indexed range (see `SheetUtil.rangeToIndex`) so it tracks row/column edits.
  range: Schema.String.annotate({ title: 'Range', description: 'A1 notation (e.g., B1:C5).' }),
  type: ChartType.annotate({ title: 'Chart type' }),
  /** The first row holds the series names. */
  header: Schema.optional(Schema.Boolean.annotate({ title: 'Header row' })),
  grid: Schema.optional(Schema.Boolean.annotate({ title: 'Grid lines' })),
  /** Bars run along the x axis, categories down the y axis (bar). */
  horizontal: Schema.optional(Schema.Boolean.annotate({ title: 'Horizontal bars' })),
});

export type Chart = Schema.Schema.Type<typeof Chart>;

// TODO(burdon): Visibility, locked, frozen, etc.
export const RowColumnMeta = Schema.Struct({
  size: Schema.optional(Schema.Number),
});

// TODO(burdon): Reconcile col/column (across packages).
// TODO(burdon): Index to all updates when rows/columns are inserted/deleted.
export class Sheet extends Type.makeObject<Sheet>(DXN.make('org.dxos.type.sheet', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),

    // Sparse map of cells referenced by index.
    cells: Schema.Record(Schema.String, CellValue).pipe(Annotation.FormInputAnnotation.set(false)),

    // Ordered row indices.
    rows: Schema.Array(Schema.String).pipe(Annotation.FormInputAnnotation.set(false)),

    // Ordered column indices.
    columns: Schema.Array(Schema.String).pipe(Annotation.FormInputAnnotation.set(false)),

    // Row metadata referenced by index.
    rowMeta: Schema.Record(Schema.String, RowColumnMeta).pipe(Annotation.FormInputAnnotation.set(false)),

    // Column metadata referenced by index.
    columnMeta: Schema.Record(Schema.String, RowColumnMeta).pipe(Annotation.FormInputAnnotation.set(false)),

    // Cell formatting referenced by indexed range.
    ranges: Schema.Array(Range).pipe(Annotation.FormInputAnnotation.set(false)),

    // Charts of ranges, shown in the charts companion.
    charts: Schema.optional(Schema.Array(Chart).pipe(Annotation.FormInputAnnotation.set(false))),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--grid-nine--regular', hue: 'indigo' }),
    Skill.SkillsAnnotation.set([SKILL_KEY]),
    Annotation.UserType.set({ tags: [Collection.ItemTag] }),
  ),
) {}

export type SheetProps = {
  name?: string;
  cells?: Record<string, CellValue>;
  /** Formatting ranges, with `range` in A1 notation. */
  ranges?: Range[];
  charts?: Chart[];
} & Partial<SheetSize>;

export const make = ({ name, cells = {}, ranges, charts, ...size }: SheetProps = {}) => {
  const sheet = Obj.make(Sheet, {
    name,
    cells: {},
    rows: [],
    columns: [],
    rowMeta: {},
    columnMeta: {},
    ranges: [],
    ...(charts && { charts }),
  });

  // Initialize and set cells within Obj.update to satisfy change context requirements.
  Obj.update(sheet, (sheet) => {
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

    ranges?.forEach(({ range, ...rest }) => {
      sheet.ranges.push({ ...rest, range: rangeToIndex(sheet, rangeFromA1Notation(range)) });
    });
  });

  return sheet;
};
