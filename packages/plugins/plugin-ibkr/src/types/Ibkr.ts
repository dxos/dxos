//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Feed, Obj, Ref, Type } from '@dxos/echo';

import { IBKR_FEED_KIND } from '../constants';

/** An open position parsed from a Flex report. */
export const Position = Schema.Struct({
  symbol: Schema.String,
  quantity: Schema.Number,
  markPrice: Schema.optional(Schema.Number),
  positionValue: Schema.optional(Schema.Number),
  costBasis: Schema.optional(Schema.Number),
  unrealizedPnl: Schema.optional(Schema.Number),
  currency: Schema.optional(Schema.String),
});
export type Position = Schema.Schema.Type<typeof Position>;

/** A cash balance parsed from a Flex report. */
export const Cash = Schema.Struct({
  currency: Schema.String,
  endingCash: Schema.Number,
});
export type Cash = Schema.Schema.Type<typeof Cash>;

/** A trade parsed from a Flex report. */
export const Trade = Schema.Struct({
  date: Schema.String,
  side: Schema.String,
  quantity: Schema.Number,
  symbol: Schema.String,
  price: Schema.optional(Schema.Number),
  commission: Schema.optional(Schema.Number),
  currency: Schema.optional(Schema.String),
});
export type Trade = Schema.Schema.Type<typeof Trade>;

/**
 * A single tax lot (one acquisition). An OPEN lot — still held, parsed from a `levelOfDetail="LOT"`
 * Open Positions row — has no `sold` date and carries the current `markPrice`/`value` and
 * `unrealizedPnl`. A CLOSED lot — a realized disposal, parsed from a `<Lot>` row in the Trades
 * section — has a `sold` date plus `proceeds` and `realizedPnl`; it is the capital-gains data for
 * tax reporting, with long-vs-short term derived from the holding period. The presence of `sold`
 * discriminates the two.
 */
export const Lot = Schema.Struct({
  symbol: Schema.String,
  quantity: Schema.Number,
  /** Acquisition date (IBKR `openDateTime`). */
  acquired: Schema.optional(Schema.String),
  /** Disposal date (IBKR `tradeDate`/`dateTime`); absent while the lot is still open. */
  sold: Schema.optional(Schema.String),
  /** Cost basis of the lot (IBKR `costBasisMoney` when open, `cost` when closed). */
  costBasis: Schema.optional(Schema.Number),
  /** Current mark price — open lots only. */
  markPrice: Schema.optional(Schema.Number),
  /** Current market value — open lots only (IBKR `positionValue`). */
  value: Schema.optional(Schema.Number),
  /** Sale proceeds — closed lots only. */
  proceeds: Schema.optional(Schema.Number),
  /** Unrealized gain/loss — open lots only (IBKR `fifoPnlUnrealized`). */
  unrealizedPnl: Schema.optional(Schema.Number),
  /** Realized gain/loss — closed lots only (IBKR `fifoPnlRealized`). */
  realizedPnl: Schema.optional(Schema.Number),
  currency: Schema.optional(Schema.String),
});
export type Lot = Schema.Schema.Type<typeof Lot>;

/**
 * A persisted Interactive Brokers Flex report captured by the daily sync.
 * Stores the raw Flex Web Service XML; chat operations parse it on read so the
 * rate-limited API is touched only by the once-a-day sync, never by chat.
 */
export const Report = Schema.Struct({
  /** Raw Flex Web Service XML (`<FlexQueryResponse>`). */
  xml: Schema.String,
  /** ISO timestamp when the report was fetched from IBKR. */
  fetchedAt: Schema.String,
}).pipe(Type.makeObject(DXN.make('org.dxos.type.ibkr.PortfolioReport', '0.1.0')));

export type Report = Type.InstanceType<typeof Report>;

/**
 * Navigable owner of the Interactive Brokers reports feed. The feed itself is hidden, so this
 * visible object is what appears in the navtree and opens the reports Article surface; its `feed`
 * carries {@link IBKR_FEED_KIND}, the kind the sync operation writes {@link Report}s into.
 */
export const Portfolio = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  feed: Ref.Ref(Feed.Feed),
}).pipe(
  Annotation.IconAnnotation.set({ icon: 'ph--chart-line--regular', hue: 'green' }),
  Type.makeObject(DXN.make('org.dxos.type.ibkr.Portfolio', '0.1.0')),
);

export type Portfolio = Type.InstanceType<typeof Portfolio>;

/** Checks if a value is a Portfolio object. */
export const isPortfolio = (value: unknown): value is Portfolio => Obj.instanceOf(Portfolio, value);

type PortfolioProps = Omit<Obj.MakeProps<typeof Portfolio>, 'feed'>;

/**
 * Creates a Portfolio with a backing feed keyed by {@link IBKR_FEED_KIND}. The feed is parented to
 * the Portfolio so it cascade-deletes with it; the sync operation finds the feed by that kind.
 */
export const makePortfolio = (props: PortfolioProps = {}): Portfolio => {
  const feed = Feed.make({ name: 'Interactive Brokers', kind: IBKR_FEED_KIND });
  const portfolio = Obj.make(Portfolio, { feed: Ref.make(feed), ...props });
  Obj.setParent(feed, portfolio);
  return portfolio;
};
