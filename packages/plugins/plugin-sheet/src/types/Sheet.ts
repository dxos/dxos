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

export const ChartType = Schema.Literals(['bar', 'pie', 'xy', 'scatter', 'heatmap', 'radar', 'map']);
export type ChartType = Schema.Schema.Type<typeof ChartType>;

/**
 * A chart of a 2D range. The first column is the category (bar, pie), x axis (xy, scatter), row (heatmap),
 * spoke (radar) or country (map); each other column is a series.
 */
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
  stacked: Schema.optional(Schema.Boolean.annotate({ title: 'Stacked bars' })),
  /** A least-squares line per series, plus one across all series (scatter). */
  regression: Schema.optional(Schema.Boolean.annotate({ title: 'Regression lines' })),
});

export type Chart = Schema.Schema.Type<typeof Chart>;

export const TimelineSpine = Schema.Literals(['left', 'center', 'right']);
export type TimelineSpine = Schema.Schema.Type<typeof TimelineSpine>;

export const TimelineScale = Schema.Literals(['linear', 'log', 'even']);
export type TimelineScale = Schema.Schema.Type<typeof TimelineScale>;

/**
 * A timeline of a 2D range with one event per row: its time (a year or date), category, title and an
 * optional description shown when the event is hovered. Each category is drawn as a column.
 */
export const Timeline = Schema.Struct({
  // TODO(burdon): Store as an indexed range (see `SheetUtil.rangeToIndex`) so it tracks row/column edits.
  range: Schema.String.annotate({ title: 'Range', description: 'A1 notation (e.g., A1:D30).' }),
  /** The first row holds column names rather than an event. */
  header: Schema.optional(Schema.Boolean.annotate({ title: 'Header row' })),
  spine: Schema.optional(TimelineSpine.annotate({ title: 'Spine' })),
  scale: Schema.optional(TimelineScale.annotate({ title: 'Scale' })),
  start: Schema.optional(Schema.String.annotate({ title: 'Start', description: 'Year or date (e.g., 1980).' })),
  end: Schema.optional(Schema.String.annotate({ title: 'End', description: 'Year or date (e.g., 2030).' })),
  today: Schema.optional(Schema.Boolean.annotate({ title: 'Show today' })),
  /** Show each event's date beside its title; on by default. */
  dates: Schema.optional(Schema.Boolean.annotate({ title: 'Show dates' })),
  /** Categories that are not drawn. */
  hidden: Schema.optional(Schema.Array(Schema.String).pipe(Annotation.FormInputAnnotation.set(false))),
  /** Categories in the order they are listed and laid out; unlisted ones follow in data order. */
  order: Schema.optional(Schema.Array(Schema.String).pipe(Annotation.FormInputAnnotation.set(false))),
  /** Category colors as a palette hue with an optional shade (`green`, `neutral-400`); others take unused hues. */
  colors: Schema.optional(Schema.Record(Schema.String, Schema.String).pipe(Annotation.FormInputAnnotation.set(false))),
});

export type Timeline = Schema.Schema.Type<typeof Timeline>;

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

    // Timeline of a range, shown in the timeline companion.
    timeline: Schema.optional(Timeline.pipe(Annotation.FormInputAnnotation.set(false))),
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
  timeline?: Timeline;
} & Partial<SheetSize>;

export const make = ({ name, cells = {}, ranges, charts, timeline, ...size }: SheetProps = {}) => {
  const sheet = Obj.make(Sheet, {
    name,
    cells: {},
    rows: [],
    columns: [],
    rowMeta: {},
    columnMeta: {},
    ranges: [],
    ...(charts && { charts }),
    ...(timeline && { timeline }),
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
