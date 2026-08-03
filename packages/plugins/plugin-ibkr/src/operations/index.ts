//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as IbkrOperation from '../types/IbkrOperation';

/** Combined handler set for all IBKR operations; provided to the Composer operation registry. */
export const IbkrOperationHandlerSet = OperationHandlerSet.keyed([
  [IbkrOperation.SyncPortfolioReport, () => import('./sync-portfolio')],
  [IbkrOperation.ImportPortfolioReport, () => import('./import-portfolio')],
  [IbkrOperation.GetPortfolio, () => import('./get-portfolio')],
  [IbkrOperation.GetTrades, () => import('./get-trades')],
  [IbkrOperation.MaterializeInstrument, () => import('./materialize-instrument')],
  [IbkrOperation.GetInstrumentFundamentals, () => import('./get-instrument-fundamentals')],
  [IbkrOperation.SyncLots, () => import('./sync-lots')],
]);
