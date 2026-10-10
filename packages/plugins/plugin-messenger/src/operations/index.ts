//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { MessengerOperation } from '#types';

export const MessengerOperationHandlerSet = OperationHandlerSet.lazy([
  MessengerOperation.Send.pipe(Operation.lazyHandler(() => import('./send.ts'))),
]);
