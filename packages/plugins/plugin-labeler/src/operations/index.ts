//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { LabelerOperation } from '#types';

export const LabelerOperationHandlerSet = OperationHandlerSet.lazy([
  LabelerOperation.LabelMailbox.pipe(Operation.lazyHandler(() => import('./label-mailbox.ts'))),
]);
