//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { InstallHarness, RunHarness } from './definitions';

export * from './definitions';
export * from './harness-command';

export const DeepSeekHandlers = OperationHandlerSet.lazy([
  InstallHarness.pipe(Operation.lazyHandler(() => import('./install-harness'))),
  RunHarness.pipe(Operation.lazyHandler(() => import('./run-harness'))),
]);
