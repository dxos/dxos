//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { IbkrOperation } from '#types';

/** Combined handler set for all IBKR operations; provided to the Composer operation registry. */
export const IbkrOperationHandlerSet = OperationHandlerSet.lazy([
  IbkrOperation.SyncPortfolioReport.pipe(Operation.lazyHandler(() => import('./sync-portfolio'))),
  IbkrOperation.ImportPortfolioReport.pipe(Operation.lazyHandler(() => import('./import-portfolio'))),
  IbkrOperation.GetPortfolio.pipe(Operation.lazyHandler(() => import('./get-portfolio'))),
  IbkrOperation.GetTrades.pipe(Operation.lazyHandler(() => import('./get-trades'))),
  IbkrOperation.MaterializeInstrument.pipe(Operation.lazyHandler(() => import('./materialize-instrument'))),
  IbkrOperation.GetInstrumentFundamentals.pipe(Operation.lazyHandler(() => import('./get-instrument-fundamentals'))),
  IbkrOperation.SyncLots.pipe(Operation.lazyHandler(() => import('./sync-lots'))),
]);
