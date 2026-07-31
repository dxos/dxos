//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { MeetingOperation } from '#types';

export const MeetingOperationHandlerSet = OperationHandlerSet.keyed([
  [MeetingOperation.Create, () => import('./create')],
  [MeetingOperation.HandlePayload, () => import('./handle-payload')],
  [MeetingOperation.SetActive, () => import('./set-active')],
  [MeetingOperation.Summarize, () => import('./summarize')],
]);
