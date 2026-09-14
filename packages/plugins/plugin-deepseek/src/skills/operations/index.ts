//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { InstallHarness, RunHarness } from './definitions.ts';

export * from './definitions.ts';
export * from './harness-command.ts';

export const DeepSeekHandlers = OperationHandlerSet.lazy([
  InstallHarness.pipe(Operation.lazyHandler(() => import('./install-harness.ts'))),
  RunHarness.pipe(Operation.lazyHandler(() => import('./run-harness.ts'))),
]);
