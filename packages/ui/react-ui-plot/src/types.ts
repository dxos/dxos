//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

export const PlotType = Schema.Literals(['bar', 'pie', 'xy', 'scatter', 'heatmap', 'radar', 'map']);
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
  /** A category's series stack into one bar rather than standing side by side (bar). */
  stacked: Schema.optional(Schema.Boolean.annotate({ title: 'Stacked bars' })),
  /** A least-squares line per series, plus one across all series when there are several (scatter). */
  regression: Schema.optional(Schema.Boolean.annotate({ title: 'Regression lines' })),
});

export type PlotOptions = Schema.Schema.Type<typeof PlotOptions>;

export type PlotValue = string | number | boolean | null;

/**
 * Column-oriented table: the first column is the category (bar, pie), the x axis (xy, scatter),
 * the row (heatmap), the spoke (radar) or the country name (map); each remaining column is a series.
 * A heatmap's series are its columns; a map uses the first series only.
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
