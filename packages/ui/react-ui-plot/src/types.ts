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

/** How a timeline draws its events; further variants (e.g. swimlanes) follow the spine. */
export const TimelineVariant = Schema.Literals(['spine']);
export type TimelineVariant = Schema.Schema.Type<typeof TimelineVariant>;

export const TIMELINE_VARIANTS: readonly TimelineVariant[] = TimelineVariant.literals;

/** Where the spine runs: on the left with events to its right, centered with columns alternating sides, or on the right. */
export const TimelineSpine = Schema.Literals(['left', 'center', 'right']);
export type TimelineSpine = Schema.Schema.Type<typeof TimelineSpine>;

export const TIMELINE_SPINES: readonly TimelineSpine[] = TimelineSpine.literals;

/** A log scale gives recent events more room than distant ones; a compact scale spaces events equally, whatever their dates. */
export const TimelineScale = Schema.Literals(['log', 'linear', 'compact']);
export type TimelineScale = Schema.Schema.Type<typeof TimelineScale>;

export const TIMELINE_SCALES: readonly TimelineScale[] = TimelineScale.literals;

/** Text size, or `auto` to follow the timeline's width; spacing scales with it. */
export const TimelineFontSize = Schema.Literals(['auto', 'xs', 'sm', 'md', 'lg', 'xl']);
export type TimelineFontSize = Schema.Schema.Type<typeof TimelineFontSize>;

export const TIMELINE_FONT_SIZES: readonly TimelineFontSize[] = TimelineFontSize.literals;

/** Presentation options for a timeline; persisted alongside the data source by the host. */
export const TimelineOptions = Schema.Struct({
  variant: Schema.optional(TimelineVariant.annotate({ title: 'Variant' })),
  spine: Schema.optional(TimelineSpine.annotate({ title: 'Spine' })),
  scale: Schema.optional(TimelineScale.annotate({ title: 'Scale' })),
  /** The first row holds column names rather than an event. */
  header: Schema.optional(Schema.Boolean.annotate({ title: 'Header row' })),
  /** Start of the visible range: a year or a date; defaults to the earliest event. */
  start: Schema.optional(Schema.String.annotate({ title: 'Start', description: 'Year or date (e.g., 1980).' })),
  /** End of the visible range: a year or a date; defaults to the latest event. */
  end: Schema.optional(Schema.String.annotate({ title: 'End', description: 'Year or date (e.g., 2030).' })),
  /** Categories that are not drawn. */
  hidden: Schema.optional(Schema.Array(Schema.String)),
  /** Categories in the order they are listed and laid out; unlisted ones follow in data order. */
  order: Schema.optional(Schema.Array(Schema.String)),
  /** Category colors as a palette hue with an optional shade (`green`, `neutral-400`); others take unused hues. */
  colors: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  /** Mark the current date. */
  today: Schema.optional(Schema.Boolean.annotate({ title: 'Show today' })),
  /** Show each event's date beside its title; on by default. */
  dates: Schema.optional(Schema.Boolean.annotate({ title: 'Show dates' })),
  /** Show events after today; off by default. */
  future: Schema.optional(Schema.Boolean.annotate({ title: 'Show future' })),
  fontSize: Schema.optional(TimelineFontSize.annotate({ title: 'Font size' })),
});

export type TimelineOptions = Schema.Schema.Type<typeof TimelineOptions>;

/** One event: a row of time, category, title and optional description. */
export type TimelineEvent = {
  /** The event's row index, stable while the rows are. */
  id: string;
  /** Milliseconds since the epoch (UTC). */
  time: number;
  /** The row's time as written: a bare year stays a year. */
  date: string;
  /** The category, drawn as a column of the timeline. */
  column: string;
  label: string;
  /** Shown in a card when the event is hovered. */
  description?: string;
  /** URL of an image shown at the top of the event's card. */
  image?: string;
};
