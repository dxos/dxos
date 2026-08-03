//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as MeetingOperation from '../types/MeetingOperation';

export const MeetingOperationHandlerSet = OperationHandlerSet.keyed([
  [MeetingOperation.Create, () => import('./create')],
  [MeetingOperation.HandlePayload, () => import('./handle-payload')],
  [MeetingOperation.SetActive, () => import('./set-active')],
  [MeetingOperation.Summarize, () => import('./summarize')],
]);
