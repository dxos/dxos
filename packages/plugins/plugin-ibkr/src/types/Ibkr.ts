//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';

import {
  EdgarAdditionalFactsAnnotation,
  EdgarAsOfConceptsAnnotation,
  EdgarFieldAnnotation,
} from '../annotations';

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

export const AssetClass = Schema.Literal(
  'stock',
  'etf',
  'mutual_fund',
  'adr',
  'reit',
  'warrant',
  'other',
);
export type AssetClass = Schema.Schema.Type<typeof AssetClass>;

/** Valuation multiples (reserved for future market-data sources). */
export const FundamentalsValuation = Schema.Struct({
  marketCap: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false), Schema.annotations({ title: 'Market cap' }))),
  pe: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false), Schema.annotations({ title: 'P/E' }))),
  pb: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false), Schema.annotations({ title: 'P/B' }))),
}).pipe(Schema.annotations({ title: 'Valuation' }));
export type FundamentalsValuation = Schema.Schema.Type<typeof FundamentalsValuation>;

/** Income-statement metrics from SEC EDGAR XBRL. */
export const FundamentalsPerformance = Schema.Struct({
  revenue: Schema.optional(
    Format.Currency({ decimals: 0, code: 'USD' }).pipe(
      EdgarFieldAnnotation.set({
        type: 'concept',
        concepts: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'],
      }),
      Schema.annotations({ title: 'Revenue' }),
    ),
  ),
  netIncome: Schema.optional(
    Format.Currency({ decimals: 0, code: 'USD' }).pipe(
      EdgarFieldAnnotation.set({
        type: 'concept',
        concepts: ['NetIncomeLoss', 'ProfitLoss'],
      }),
      Schema.annotations({ title: 'Net income' }),
    ),
  ),
  eps: Schema.optional(
    Format.Currency({ decimals: 2, code: 'USD' }).pipe(
      EdgarFieldAnnotation.set({
        type: 'concept',
        concepts: ['EarningsPerShareDiluted', 'EarningsPerShareBasic'],
        units: ['USD/shares', 'USD'],
      }),
      Schema.annotations({ title: 'EPS' }),
    ),
  ),
}).pipe(Schema.annotations({ title: 'Performance' }));
export type FundamentalsPerformance = Schema.Schema.Type<typeof FundamentalsPerformance>;

/** Profitability and leverage ratios derived from SEC EDGAR XBRL. */
export const FundamentalsRatios = Schema.Struct({
  roe: Schema.optional(
    Format.Percent({ decimals: 1 }).pipe(
      EdgarFieldAnnotation.set({
        type: 'ratio',
        numerator: { concepts: ['NetIncomeLoss', 'ProfitLoss'] },
        denominator: {
          concepts: [
            'StockholdersEquity',
            'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
          ],
        },
      }),
      Schema.annotations({ title: 'ROE' }),
    ),
  ),
  debtToEquity: Schema.optional(
    Schema.Number.pipe(
      EdgarFieldAnnotation.set({
        type: 'ratio',
        numerator: { concepts: ['Liabilities'] },
        denominator: {
          concepts: [
            'StockholdersEquity',
            'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
          ],
        },
      }),
      Schema.multipleOf(0.01),
      Schema.annotations({ title: 'Debt / equity' }),
    ),
  ),
}).pipe(Schema.annotations({ title: 'Ratios' }));
export type FundamentalsRatios = Schema.Schema.Type<typeof FundamentalsRatios>;

/** Remaining us-gaap concepts from SEC EDGAR, keyed by XBRL concept name. */
export const FundamentalsAdditional = Schema.Struct({
  additionalFacts: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Number }).pipe(
      EdgarAdditionalFactsAnnotation.set(true),
      Schema.annotations({ title: 'Additional facts' }),
    ),
  ),
}).pipe(Schema.annotations({ title: 'Additional' }));
export type FundamentalsAdditional = Schema.Schema.Type<typeof FundamentalsAdditional>;

/** Transient fundamentals snapshot returned by {@link IbkrOperation.GetInstrumentFundamentals} from SEC EDGAR. */
export const FundamentalsSnapshot = Schema.Struct({
  asOf: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false), Schema.annotations({ title: 'As of' }))),
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
    name: Schema.String.pipe(Schema.annotations({ title: 'Name' })),
    symbol: Schema.String.pipe(Schema.annotations({ title: 'Symbol' })),
    exchange: Schema.optional(Schema.String.pipe(Schema.annotations({ title: 'Exchange' }))),
    assetClass: Schema.optional(AssetClass.pipe(Schema.annotations({ title: 'Asset class' }))),
    currency: Schema.optional(Schema.String.pipe(Schema.annotations({ title: 'Currency' }))),
    sector: Schema.optional(Schema.String.pipe(Schema.annotations({ title: 'Sector' }))),
    industry: Schema.optional(Schema.String.pipe(Schema.annotations({ title: 'Industry' }))),
    country: Schema.optional(Schema.String.pipe(Schema.annotations({ title: 'Country' }))),
    description: Schema.optional(Schema.String.pipe(Schema.annotations({ title: 'Description' }))),
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
