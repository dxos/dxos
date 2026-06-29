//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Credential, Operation } from '@dxos/compute';
import { DXN, Database } from '@dxos/echo';

import * as Ibkr from './Ibkr';

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
