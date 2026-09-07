//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { QaOperation } from '#types';

export const QaOperationHandlerSet = OperationHandlerSet.lazy([
  QaOperation.CreatePlan.pipe(Operation.lazyHandler(() => import('./create-plan'))),
  QaOperation.SetCase.pipe(Operation.lazyHandler(() => import('./set-case'))),
  QaOperation.RemoveCase.pipe(Operation.lazyHandler(() => import('./remove-case'))),
  QaOperation.SetCaseOrder.pipe(Operation.lazyHandler(() => import('./set-case-order'))),
  QaOperation.StartRun.pipe(Operation.lazyHandler(() => import('./start-run'))),
  QaOperation.PushResult.pipe(Operation.lazyHandler(() => import('./push-result'))),
  QaOperation.CompleteRun.pipe(Operation.lazyHandler(() => import('./complete-run'))),
  QaOperation.QueryRuns.pipe(Operation.lazyHandler(() => import('./query-runs'))),
  QaOperation.GetCaseHistory.pipe(Operation.lazyHandler(() => import('./get-case-history'))),
]);
