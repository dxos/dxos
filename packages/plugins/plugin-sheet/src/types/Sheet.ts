//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { addressFromA1Notation, isFormula, rangeFromA1Notation } from '@dxos/compute-hyperformula/types';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Collection, DXN, EID, Format, Obj, Ref, Type } from '@dxos/echo';

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

export const TimelineSpine = Schema.Literals(['left', 'center', 'right']);
export type TimelineSpine = Schema.Schema.Type<typeof TimelineSpine>;

export const TimelineScale = Schema.Literals(['log', 'linear', 'compact']);
export type TimelineScale = Schema.Schema.Type<typeof TimelineScale>;

export const TimelineFontSize = Schema.Literals(['auto', 'xs', 'sm', 'md', 'lg', 'xl']);
export type TimelineFontSize = Schema.Schema.Type<typeof TimelineFontSize>;

/**
 * How a timeline chart is drawn. Its range has one event per row: its time (a year or date), category, title, and
 * an optional description and image URL shown in the event's card. Each category is drawn as a column.
 */
export const TimelineSettings = Schema.Struct({
  spine: Schema.optional(TimelineSpine.annotate({ title: 'Spine' })),
  scale: Schema.optional(TimelineScale.annotate({ title: 'Scale' })),
  start: Schema.optional(Schema.String.annotate({ title: 'Start', description: 'Year or date (e.g., 1980).' })),
  end: Schema.optional(Schema.String.annotate({ title: 'End', description: 'Year or date (e.g., 2030).' })),
  today: Schema.optional(Schema.Boolean.annotate({ title: 'Show today' })),
  /** Show each event's date beside its title; on by default. */
  dates: Schema.optional(Schema.Boolean.annotate({ title: 'Show dates' })),
  /** Show events after today; off by default. */
  future: Schema.optional(Schema.Boolean.annotate({ title: 'Show future' })),
  fontSize: Schema.optional(TimelineFontSize.annotate({ title: 'Font size' })),
  /** Categories that are not drawn. */
  hidden: Schema.optional(Schema.Array(Schema.String).pipe(Annotation.FormInputAnnotation.set(false))),
  /** Categories in the order they are listed and laid out; unlisted ones follow in data order. */
  order: Schema.optional(Schema.Array(Schema.String).pipe(Annotation.FormInputAnnotation.set(false))),
  /** Category colors as a palette hue with an optional shade (`green`, `neutral-400`); others take unused hues. */
  colors: Schema.optional(Schema.Record(Schema.String, Schema.String).pipe(Annotation.FormInputAnnotation.set(false))),
});

export type TimelineSettings = Schema.Schema.Type<typeof TimelineSettings>;

export const ChartType = Schema.Literals(['bar', 'pie', 'xy', 'scatter', 'heatmap', 'radar', 'map', 'timeline']);
export type ChartType = Schema.Schema.Type<typeof ChartType>;

/**
 * How a chart of a 2D range is drawn. The first column is the category (bar, pie), x axis (xy, scatter), row
 * (heatmap), spoke (radar) or country (map); each other column is a series. A timeline instead has one event per row.
 */
export const ChartProperties = Schema.Struct({
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
  /** How a timeline is drawn (timeline). */
  timeline: Schema.optional(TimelineSettings.annotate({ title: 'Timeline' })),
});

export type ChartProperties = Schema.Schema.Type<typeof ChartProperties>;

/**
 * A chart of a range of a sheet. Its own object, owned by the sheet, so documents can embed it as a section or slide.
 */
export class Chart extends Type.makeObject<Chart>(DXN.make('org.dxos.type.chart', '0.1.0'))(
  Schema.Struct({
    /** The sheet whose range is drawn; a reverse edge of the sheet's owning `charts` list. */
    sheet: Schema.suspend((): Ref.RefSchema<Sheet> => Ref.Ref(Sheet)).pipe(Annotation.FormInputAnnotation.set(false)),
    ...ChartProperties.fields,
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--chart-bar--regular', hue: 'indigo' })),
) {}

// TODO(burdon): Visibility, locked, frozen, etc.
export const RowColumnMeta = Schema.Struct({
  size: Schema.optional(Schema.Number),
});

// TODO(burdon): Reconcile col/column (across packages).
// TODO(burdon): Index to all updates when rows/columns are inserted/deleted.
export class Sheet extends Type.makeObject<Sheet>(DXN.make('org.dxos.type.sheet', '0.2.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Text))),

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

    // Charts of ranges, shown in the charts companion; owned, so they are deleted with the sheet.
    charts: Schema.optional(
      Schema.Array(Ref.Ref(Chart)).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),
    ),
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
  /** Charts of the sheet's ranges, created as objects owned by the sheet. */
  charts?: ChartProperties[];
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

  charts?.forEach((chart) => addChart(sheet, chart));
  return sheet;
};

/** A chart of the sheet's range, owned by the sheet; the sheet's database takes it with the ref. */
export const addChart = (sheet: Sheet, props: ChartProperties): Chart => {
  const chart = Obj.make(Chart, { ...copyChartProperties(props), sheet: Ref.make(sheet) });
  Obj.update(sheet, (sheet) => {
    sheet.charts = [...(sheet.charts ?? []), Ref.make(chart)];
  });
  return chart;
};

/** Sets a chart's properties. */
export const updateChart = (chart: Chart, props: Partial<ChartProperties>): void => {
  Obj.update(chart, (chart) => {
    Object.assign(chart, copyChartProperties(props));
  });
};

/** Removes a chart from its sheet and deletes it. */
export const removeChart = (sheet: Sheet, chart: Chart): void => {
  Obj.update(sheet, (sheet) => {
    sheet.charts = (sheet.charts ?? []).filter((ref) => {
      const eid = EID.tryParse(ref.uri);
      return !eid || EID.getEntityId(eid) !== chart.id;
    });
  });
  Obj.getDatabase(chart)?.remove(chart);
};

// The schema type's arrays are read-only; an object takes mutable copies of a timeline's lists.
const copyChartProperties = <T extends Partial<ChartProperties>>({ timeline, ...props }: T) => ({
  ...props,
  ...(timeline && {
    timeline: {
      ...timeline,
      ...(timeline.hidden && { hidden: [...timeline.hidden] }),
      ...(timeline.order && { order: [...timeline.order] }),
      ...(timeline.colors && { colors: { ...timeline.colors } }),
    },
  }),
});
