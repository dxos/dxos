//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { IbkrOperation } from '#types';

/** Combined handler set for all IBKR operations; provided to the Composer operation registry. */
export const IbkrOperationHandlerSet = OperationHandlerSet.lazy([
  IbkrOperation.SyncPortfolioReport.pipe(Operation.lazyHandler(() => import('./sync-portfolio.ts'))),
  IbkrOperation.ImportPortfolioReport.pipe(Operation.lazyHandler(() => import('./import-portfolio.ts'))),
  IbkrOperation.GetPortfolio.pipe(Operation.lazyHandler(() => import('./get-portfolio.ts'))),
  IbkrOperation.GetTrades.pipe(Operation.lazyHandler(() => import('./get-trades.ts'))),
  IbkrOperation.MaterializeInstrument.pipe(Operation.lazyHandler(() => import('./materialize-instrument.ts'))),
  IbkrOperation.GetInstrumentFundamentals.pipe(Operation.lazyHandler(() => import('./get-instrument-fundamentals.ts'))),
  IbkrOperation.SyncLots.pipe(Operation.lazyHandler(() => import('./sync-lots.ts'))),
]);
