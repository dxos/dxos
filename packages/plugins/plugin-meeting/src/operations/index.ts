//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as MeetingOperation from '../types/MeetingOperation';

export const MeetingOperationHandlerSet = OperationHandlerSet.lazy([
  MeetingOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
  MeetingOperation.HandlePayload.pipe(Operation.lazyHandler(() => import('./handle-payload'))),
  MeetingOperation.SetActive.pipe(Operation.lazyHandler(() => import('./set-active'))),
  MeetingOperation.Summarize.pipe(Operation.lazyHandler(() => import('./summarize'))),
]);
