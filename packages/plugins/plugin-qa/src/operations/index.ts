//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { QaOperation } from '#types';

export const QaOperationHandlerSet = OperationHandlerSet.lazy([
  QaOperation.CreatePlan.pipe(Operation.lazyHandler(() => import('./create-plan.ts'))),
  QaOperation.SetCase.pipe(Operation.lazyHandler(() => import('./set-case.ts'))),
  QaOperation.RemoveCase.pipe(Operation.lazyHandler(() => import('./remove-case.ts'))),
  QaOperation.SetCaseOrder.pipe(Operation.lazyHandler(() => import('./set-case-order.ts'))),
  QaOperation.StartRun.pipe(Operation.lazyHandler(() => import('./start-run.ts'))),
  QaOperation.PushResult.pipe(Operation.lazyHandler(() => import('./push-result.ts'))),
  QaOperation.CompleteRun.pipe(Operation.lazyHandler(() => import('./complete-run.ts'))),
  QaOperation.QueryRuns.pipe(Operation.lazyHandler(() => import('./query-runs.ts'))),
  QaOperation.GetCaseHistory.pipe(Operation.lazyHandler(() => import('./get-case-history.ts'))),
]);
