//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

/** What an {@link Observation} records. */
export const ObservationKind = Schema.Literals([
  /** A daily OHLCV bar. */
  'price',
  /** FINRA daily short-sale volume. */
  'short-volume',
  /** One non-derivative transaction of an SEC Form 4. */
  'insider-trade',
  /** One holding row of an SEC 13F information table. */
  'holding',
  /** An SEC filing (8-K, 10-Q, 10-K, S-1, …) as listed in a company's EDGAR feed. */
  'filing',
  /** A congressional financial-disclosure filing (House periodic transaction report). */
  'congress-filing',
]);
export type ObservationKind = Schema.Schema.Type<typeof ObservationKind>;

/**
 * One row of structured market data, as a source published it. Lives in a source's feed with the origin's foreign key
 * on `Obj.Meta.keys`; the pipeline turns it into facts deterministically, without a model.
 */
export class Observation extends Type.makeObject<Observation>(DXN.make('org.dxos.type.finance.observation', '0.1.0'))(
  Schema.Struct({
    kind: ObservationKind,
    /** Ticker the row is about, canonical (`BRK.B`), when it names one. */
    symbol: Schema.String.pipe(Schema.optional),
    /** Company or issuer name as the source spells it. */
    issuer: Schema.String.pipe(Schema.optional),
    /** ISO date (or time) the row refers to: trading day, transaction date, filing date. */
    date: Schema.String,
    /** Link to the source document. */
    link: Schema.String.pipe(Schema.optional),
    /** Numeric fields (close, volume, shares, price, value, …). */
    values: Schema.Record(Schema.String, Schema.Number),
    /** Text fields (owner, role, transaction code, form type, …). */
    labels: Schema.Record(Schema.String, Schema.String),
  }).pipe(
    Annotation.LabelAnnotation.set(['symbol']),
    Annotation.IconAnnotation.set({ icon: 'ph--chart-line--regular', hue: 'green' }),
  ),
) {}

/** Creates an {@link Observation} keyed by its origin. */
export const makeObservation = (
  props: Omit<Obj.MakeProps<typeof Observation>, 'values' | 'labels'> & {
    readonly key: { readonly source: string; readonly id: string };
    readonly values?: Record<string, number>;
    readonly labels?: Record<string, string>;
  },
): Observation => {
  const { key, values = {}, labels = {}, ...rest } = props;
  return Obj.make(Observation, { [Obj.Meta]: { keys: [{ ...key }] }, ...rest, values, labels });
};

/** The `Feed.kind` prefix of the feeds a finance source writes, one feed per source. */
export const FEED_KIND = 'org.dxos.plugin.finance.feed';

/** The kind of a source's feed. */
export const feedKind = (source: string): string => `${FEED_KIND}/${source}`;
