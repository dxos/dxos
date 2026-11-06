//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { LighthouseOperation } from '#types';

export const LighthouseOperationHandlerSet = OperationHandlerSet.lazy([
  LighthouseOperation.StartResearch.pipe(Operation.lazyHandler(() => import('./start-research.ts'))),
  LighthouseOperation.SendToResearch.pipe(Operation.lazyHandler(() => import('./send-to-research.ts'))),
  LighthouseOperation.StopResearch.pipe(Operation.lazyHandler(() => import('./stop-research.ts'))),
  LighthouseOperation.SyncFindings.pipe(Operation.lazyHandler(() => import('./sync-findings.ts'))),
  LighthouseOperation.KeepFinding.pipe(Operation.lazyHandler(() => import('./keep-finding.ts'))),
  LighthouseOperation.VoteFinding.pipe(Operation.lazyHandler(() => import('./vote-finding.ts'))),
  LighthouseOperation.ExtendFinding.pipe(Operation.lazyHandler(() => import('./extend-finding.ts'))),
]);
