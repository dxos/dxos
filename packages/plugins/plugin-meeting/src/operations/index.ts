//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { MeetingOperation } from '#types';

export const MeetingOperationHandlerSet = OperationHandlerSet.lazy([
  MeetingOperation.Create.pipe(Operation.lazyHandler(() => import('./create.ts'))),
  MeetingOperation.HandlePayload.pipe(Operation.lazyHandler(() => import('./handle-payload.ts'))),
  MeetingOperation.SetActive.pipe(Operation.lazyHandler(() => import('./set-active.ts'))),
  MeetingOperation.Summarize.pipe(Operation.lazyHandler(() => import('./summarize.ts'))),
]);
