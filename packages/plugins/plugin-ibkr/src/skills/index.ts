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
    description: "Answer questions about the user's Interactive Brokers portfolio, cash, and trades.",
    tools: Skill.toolDefinitions({
      operations: [IbkrOperation.GetPortfolio, IbkrOperation.GetTrades, IbkrOperation.SyncPortfolioReport],
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
      `,
    }),
    agentCanEnable: true,
  });

const skill: Skill.Definition = {
  key: IBKR_SKILL_KEY,
  make,
};

export const IbkrSkill = skill;
