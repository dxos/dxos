//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CallOperation } from '#types';

export const CallOperationHandlerSet = OperationHandlerSet.lazy([
  CallOperation.SetSimulatedParticipants.pipe(Operation.lazyHandler(() => import('./set-simulated-participants.ts'))),
]);
