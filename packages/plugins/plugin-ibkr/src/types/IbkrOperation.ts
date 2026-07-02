//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Credential, Operation } from '@dxos/compute';
import { Database, DXN, Ref } from '@dxos/echo';

import * as Ibkr from './Ibkr';

const ForeignKey = Schema.Struct({
  source: Schema.String,
  id: Schema.String,
});

const makeKey = (name: string) => DXN.make(`org.dxos.function.ibkr.${name}`);

/** Fetches a fresh Flex report from IBKR and appends it to the feed; driven by the daily timer trigger. */
export const SyncPortfolioReport = Operation.make({
  meta: {
    key: makeKey('syncPortfolioReport'),
    name: 'Sync IBKR portfolio',
    description: 'Fetch the latest Interactive Brokers Flex report and store it for offline reads.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    fetchedAt: Schema.String,
    positions: Schema.Number,
    trades: Schema.Number,
    cash: Schema.Number,
  }),
  services: [Credential.CredentialsService, Database.Service],
});

/** Appends a manually supplied raw Flex report XML to the feed, bypassing the rate-limited IBKR fetch. */
export const ImportPortfolioReport = Operation.make({
  meta: {
    key: makeKey('importPortfolioReport'),
    name: 'Import IBKR report',
    description: 'Store a raw Interactive Brokers Flex report XML for offline reads, without calling IBKR.',
    icon: 'ph--upload-simple--regular',
  },
  input: Schema.Struct({
    /** Raw Flex Web Service `<FlexQueryResponse>` document. */
    xml: Schema.String,
  }),
  output: Schema.Struct({
    fetchedAt: Schema.String,
    positions: Schema.Number,
    trades: Schema.Number,
    cash: Schema.Number,
  }),
  services: [Database.Service],
});

/** Returns the open positions and cash balances from the most recent stored report. */
export const GetPortfolio = Operation.make({
  meta: {
    key: makeKey('getPortfolio'),
    name: 'Get IBKR portfolio',
    description: 'Read the current Interactive Brokers open positions and cash balances from the latest sync.',
    icon: 'ph--chart-pie--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    fetchedAt: Schema.optional(Schema.String),
    positions: Schema.Array(Ibkr.Position),
    cash: Schema.Array(Ibkr.Cash),
  }),
  services: [Database.Service],
});

/** Returns the trade history from the most recent stored report. */
export const GetTrades = Operation.make({
  meta: {
    key: makeKey('getTrades'),
    name: 'Get IBKR trades',
    description: 'Read the Interactive Brokers trade history from the latest sync.',
    icon: 'ph--receipt--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    fetchedAt: Schema.optional(Schema.String),
    trades: Schema.Array(Ibkr.Trade),
  }),
  services: [Database.Service],
});

/** Find-or-create an Instrument keyed by a foreign id. */
export const MaterializeInstrument = Operation.make({
  meta: {
    key: makeKey('materializeInstrument'),
    name: 'Materialize instrument',
    description: 'Find or create a tradable Instrument keyed by ticker/exchange foreign id (idempotent).',
    icon: 'ph--chart-line-up--regular',
  },
  input: Schema.Struct({
    key: ForeignKey,
    name: Schema.optional(Schema.String),
    symbol: Schema.String,
    exchange: Schema.optional(Schema.String),
    assetClass: Schema.optional(Ibkr.AssetClass),
    extraKeys: Schema.optional(Schema.Array(ForeignKey)),
  }),
  output: Schema.Struct({
    instrument: Ref.Ref(Ibkr.Instrument),
    created: Schema.Boolean,
  }),
  services: [Database.Service],
});

/** Fetches a compact fundamentals snapshot for an Instrument from SEC EDGAR. */
export const GetInstrumentFundamentals = Operation.make({
  meta: {
    key: makeKey('getInstrumentFundamentals'),
    name: 'Get instrument fundamentals',
    description: 'Fetch filing-based fundamentals for a tradable Instrument from SEC EDGAR company facts.',
    icon: 'ph--chart-bar--regular',
  },
  input: Schema.Struct({
    instrument: Ref.Ref(Ibkr.Instrument),
  }),
  output: Ibkr.FundamentalsSnapshot,
  services: [Database.Service],
});
