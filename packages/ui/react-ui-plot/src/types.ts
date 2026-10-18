//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

export const PlotType = Schema.Literals(['bar', 'pie', 'xy']);
export type PlotType = Schema.Schema.Type<typeof PlotType>;

export const PLOT_TYPES: readonly PlotType[] = PlotType.literals;

/** Presentation options; persisted alongside the data source by the host. */
export const PlotOptions = Schema.Struct({
  type: PlotType.annotate({ title: 'Chart type' }),
  /** The first row holds the series names. */
  header: Schema.optional(Schema.Boolean.annotate({ title: 'Header row' })),
  /** Draw grid lines (bar and xy). */
  grid: Schema.optional(Schema.Boolean.annotate({ title: 'Grid lines' })),
  /** Bars run along the x axis, categories down the y axis (bar). */
  horizontal: Schema.optional(Schema.Boolean.annotate({ title: 'Horizontal bars' })),
});

export type PlotOptions = Schema.Schema.Type<typeof PlotOptions>;

export type PlotValue = string | number | boolean | null;

/**
 * Column-oriented table: the first column is the category (bar, pie) or the x axis (xy);
 * each remaining column is a series.
 */
export type PlotData = {
  columns: string[];
  rows: PlotValue[][];
};

/** One series value in long form, the shape Observable Plot marks consume. */
export type PlotDatum = {
  key: PlotValue;
  series: string;
  value: number;
};
