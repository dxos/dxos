//
// Copyright 2026 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { IBKR_SKILL_KEY } from '../constants';
import { IbkrOperation } from '../types';

const make = () =>
  Skill.make({
    key: IBKR_SKILL_KEY,
    name: 'Interactive Brokers',
    description:
      "Answer questions about the user's Interactive Brokers portfolio and create Instrument research objects by ticker.",
    tools: Skill.toolDefinitions({
      operations: [
        IbkrOperation.GetPortfolio,
        IbkrOperation.GetTrades,
        IbkrOperation.SyncPortfolioReport,
        IbkrOperation.MaterializeInstrument,
        IbkrOperation.GetInstrumentFundamentals,
      ],
    }),
    instructions: Template.make({
      source: trim`
        You can read the user's Interactive Brokers account, captured by a once-a-day background sync.
        Use GetPortfolio for the latest open positions and cash balances.
        Use GetTrades for the latest stored trade history.
        Each result includes fetchedAt — the time the data was synced from IBKR; relay it so the user knows how fresh the data is.
        If a result is empty (no sync has run yet), or the user explicitly asks to refresh, run SyncPortfolioReport. It calls IBKR directly, can take up to a minute, and is rate-limited — run it at most once and never in a loop.
        Amounts are in each instrument's own currency, as indicated by the currency field on each position, cash balance, and trade.
        Data is an end-of-day snapshot, not a live quote stream.

        # Instruments (research by ticker)
        Use MaterializeInstrument to create or find a tradable Instrument in the user's space.
        - symbol: ticker (e.g. AAPL, MSFT)
        - exchange: optional MIC-style exchange prefix for US equities (default NASDAQ when omitted)
        - key: { source: "ticker/{EXCHANGE}", id: "{SYMBOL}" } — exchange uppercased (e.g. { source: "ticker/NASDAQ", id: "AAPL" })
        - name: optional company name; defaults to symbol
        - assetClass: optional (stock, etf, mutual_fund, adr, reit, warrant, other)
        The operation is idempotent: an existing Instrument with the same foreign key is returned instead of creating a duplicate.
        A tradingview.com foreign key is stamped automatically when exchange is provided.
        After materializing, tell the user to open the Instrument to view the TradingView chart and SEC EDGAR fundamentals panel.
        Use GetInstrumentFundamentals with the Instrument ref when the user asks for filing-based fundamentals (revenue, net income, EPS, ROE, debt/equity) without opening the UI.
      `,
    }),
    agentCanEnable: true,
  });

const skill: Skill.Definition = {
  key: IBKR_SKILL_KEY,
  make,
};

export const IbkrSkill = skill;
