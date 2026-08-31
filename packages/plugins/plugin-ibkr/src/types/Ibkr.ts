//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';
import * as ConnectorAnnotations from '@dxos/plugin-connector/ConnectorAnnotations';

import { EdgarAdditionalFactsAnnotation, EdgarAsOfConceptsAnnotation, EdgarFieldAnnotation } from '../annotations';
import { IBKR_CONNECTOR_ID, IBKR_FEED_KIND } from '../constants';

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

/** Shared lot fields parsed from Flex XML before materializing a persisted {@link Lot}. */
// TODO(dmaretskyi): Re-use the Lot type instead of duplicating. Make `Ttpe.fields` typesafe and add `type.propertiesSchema`.
export const LotSnapshot = Schema.Struct({
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
export type LotSnapshot = Schema.Schema.Type<typeof LotSnapshot>;

export const AssetClass = Schema.Literals(['stock', 'etf', 'mutual_fund', 'adr', 'reit', 'warrant', 'other']);
export type AssetClass = Schema.Schema.Type<typeof AssetClass>;

/** Valuation multiples (reserved for future market-data sources). */
export const FundamentalsValuation = Schema.Struct({
  marketCap: Schema.optional(
    Schema.Number.pipe(FormInputAnnotation.set(false), Schema.annotate({ title: 'Market cap' })),
  ),
  pe: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false), Schema.annotate({ title: 'P/E' }))),
  pb: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false), Schema.annotate({ title: 'P/B' }))),
}).pipe(Schema.annotate({ title: 'Valuation' }));
export type FundamentalsValuation = Schema.Schema.Type<typeof FundamentalsValuation>;

/** Income-statement metrics from SEC EDGAR XBRL. */
export const FundamentalsPerformance = Schema.Struct({
  revenue: Schema.optional(
    Format.Currency({ decimals: 0, code: 'USD' }).pipe(
      EdgarFieldAnnotation.set({
        type: 'concept',
        concepts: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'],
      }),
      Schema.annotate({ title: 'Revenue' }),
    ),
  ),
  netIncome: Schema.optional(
    Format.Currency({ decimals: 0, code: 'USD' }).pipe(
      EdgarFieldAnnotation.set({
        type: 'concept',
        concepts: ['NetIncomeLoss', 'ProfitLoss'],
      }),
      Schema.annotate({ title: 'Net income' }),
    ),
  ),
  eps: Schema.optional(
    Format.Currency({ decimals: 2, code: 'USD' }).pipe(
      EdgarFieldAnnotation.set({
        type: 'concept',
        concepts: ['EarningsPerShareDiluted', 'EarningsPerShareBasic'],
        units: ['USD/shares', 'USD'],
      }),
      Schema.annotate({ title: 'EPS' }),
    ),
  ),
}).pipe(Schema.annotate({ title: 'Performance' }));
export type FundamentalsPerformance = Schema.Schema.Type<typeof FundamentalsPerformance>;

/** Profitability and leverage ratios derived from SEC EDGAR XBRL. */
export const FundamentalsRatios = Schema.Struct({
  roe: Schema.optional(
    Format.Percent({ decimals: 1 }).pipe(
      EdgarFieldAnnotation.set({
        type: 'ratio',
        numerator: { concepts: ['NetIncomeLoss', 'ProfitLoss'] },
        denominator: {
          concepts: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],
        },
      }),
      Schema.annotate({ title: 'ROE' }),
    ),
  ),
  debtToEquity: Schema.optional(
    Schema.Number.pipe(
      EdgarFieldAnnotation.set({
        type: 'ratio',
        numerator: { concepts: ['Liabilities'] },
        denominator: {
          concepts: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],
        },
      }),
      Schema.check(Schema.isMultipleOf(0.01)),
      Schema.annotate({ title: 'Debt / equity' }),
    ),
  ),
}).pipe(Schema.annotate({ title: 'Ratios' }));
export type FundamentalsRatios = Schema.Schema.Type<typeof FundamentalsRatios>;

/** Remaining us-gaap concepts from SEC EDGAR, keyed by XBRL concept name. */
export const FundamentalsAdditional = Schema.Struct({
  additionalFacts: Schema.optional(
    Schema.Record(Schema.String, Schema.Number).pipe(
      EdgarAdditionalFactsAnnotation.set(true),
      Schema.annotate({ title: 'Additional facts' }),
    ),
  ),
}).pipe(Schema.annotate({ title: 'Additional' }));
export type FundamentalsAdditional = Schema.Schema.Type<typeof FundamentalsAdditional>;

/** Transient fundamentals snapshot returned by {@link IbkrOperation.GetInstrumentFundamentals} from SEC EDGAR. */
export const FundamentalsSnapshot = Schema.Struct({
  asOf: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false), Schema.annotate({ title: 'As of' }))),
  valuation: Schema.optional(FundamentalsValuation),
  performance: Schema.optional(FundamentalsPerformance),
  ratios: Schema.optional(FundamentalsRatios),
  additional: Schema.optional(FundamentalsAdditional),
}).pipe(
  EdgarAsOfConceptsAnnotation.set([
    ['NetIncomeLoss', 'ProfitLoss'],
    ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'],
    ['Assets'],
  ]),
);
export type FundamentalsSnapshot = Schema.Schema.Type<typeof FundamentalsSnapshot>;

/**
 * A first-class reference to a tradable security. Holds static identity metadata only; market data
 * and fundamentals are fetched at view time via operations and never persisted on the object.
 */
export class Instrument extends Type.makeObject<Instrument>(DXN.make('org.dxos.type.ibkr.Instrument', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' })),
    symbol: Schema.String.pipe(Schema.annotate({ title: 'Symbol' })),
    exchange: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Exchange' }))),
    assetClass: Schema.optional(AssetClass.pipe(Schema.annotate({ title: 'Asset class' }))),
    currency: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Currency' }))),
    sector: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Sector' }))),
    industry: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Industry' }))),
    country: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Country' }))),
    description: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Description' }))),
  }).pipe(
    LabelAnnotation.set(['symbol', 'name']),
    Annotation.IconAnnotation.set({ icon: 'ph--chart-line-up--regular', hue: 'blue' }),
  ),
) {}

/** Checks if a value is an Instrument object. */
export const isInstrument = (value: unknown): value is Instrument => Obj.instanceOf(Instrument, value);

/** Creates an Instrument with optional foreign keys stamped on `Obj.Meta.keys`. */
export const makeInstrument = (
  props: Obj.MakeProps<typeof Instrument> & { keys?: readonly { source: string; id: string }[] },
): Instrument => {
  const { keys, ...fields } = props;
  return Obj.make(Instrument, {
    ...(keys ? { [Obj.Meta]: { keys: [...keys] } } : {}),
    ...fields,
  });
};

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
  /** Owned feed: `SetParent` cascades it with the portfolio. */
  feed: Ref.Ref(Feed.Feed).pipe(Annotation.SetParent.set(true)),
}).pipe(
  Annotation.IconAnnotation.set({ icon: 'ph--chart-line--regular', hue: 'green' }),
  // Offer "Connect Interactive Brokers" in the portfolio toolbar. IBKR has no external-sync Cursor, so
  // the connection is detected space-wide by connectorId (bindTarget omitted).
  ConnectorAnnotations.ConnectorAuthAnnotation.set({ connectorIds: [IBKR_CONNECTOR_ID] }),
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
  return Obj.make(Portfolio, { feed: Ref.make(feed), ...props });
};

/**
 * A persisted tax lot synced from the portfolio's latest Flex report. An OPEN lot — still held —
 * has no `sold` date and carries the current `markPrice`/`value` and `unrealizedPnl`. A CLOSED lot
 * — a realized disposal — has a `sold` date plus `proceeds` and `realizedPnl`. The presence of
 * `sold` discriminates the two.
 */
export class Lot extends Type.makeObject<Lot>(DXN.make('org.dxos.type.ibkr.Lot', '0.1.0'))(
  Schema.Struct({
    portfolio: Ref.Ref(Portfolio),
    instrument: Ref.Ref(Instrument),
    symbol: Schema.String.pipe(Schema.annotate({ title: 'Symbol' })),
    quantity: Schema.Number.pipe(Schema.annotate({ title: 'Quantity' })),
    acquired: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Acquired' }))),
    sold: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Sold' }))),
    costBasis: Schema.optional(Schema.Number.pipe(Schema.annotate({ title: 'Cost basis' }))),
    markPrice: Schema.optional(Schema.Number.pipe(Schema.annotate({ title: 'Mark price' }))),
    value: Schema.optional(Schema.Number.pipe(Schema.annotate({ title: 'Value' }))),
    proceeds: Schema.optional(Schema.Number.pipe(Schema.annotate({ title: 'Proceeds' }))),
    unrealizedPnl: Schema.optional(Schema.Number.pipe(Schema.annotate({ title: 'Unrealized P/L' }))),
    realizedPnl: Schema.optional(Schema.Number.pipe(Schema.annotate({ title: 'Realized P/L' }))),
    currency: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Currency' }))),
  }).pipe(
    LabelAnnotation.set(['symbol', 'quantity']),
    Annotation.IconAnnotation.set({ icon: 'ph--stack--regular', hue: 'amber' }),
  ),
) {}
