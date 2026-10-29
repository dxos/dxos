//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DevShellOperation } from '#types';

export const DevShellOperationHandlerSet = OperationHandlerSet.lazy([
  DevShellOperation.Bash.pipe(Operation.lazyHandler(() => import('./bash.ts'))),
  DevShellOperation.Edits.pipe(Operation.lazyHandler(() => import('./edits.ts'))),
]);
