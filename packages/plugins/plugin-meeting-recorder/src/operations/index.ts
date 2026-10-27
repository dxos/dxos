//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { MeetingRecorderOperation } from '#types';

export const MeetingRecorderOperationHandlerSet = OperationHandlerSet.lazy([
  MeetingRecorderOperation.ClearDetection.pipe(Operation.lazyHandler(() => import('./clear-detection.ts'))),
  MeetingRecorderOperation.HandleDetection.pipe(Operation.lazyHandler(() => import('./handle-detection.ts'))),
  MeetingRecorderOperation.Start.pipe(Operation.lazyHandler(() => import('./start.ts'))),
  MeetingRecorderOperation.Stop.pipe(Operation.lazyHandler(() => import('./stop.ts'))),
]);
