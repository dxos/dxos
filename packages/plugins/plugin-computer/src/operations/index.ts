//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ComputerOperation } from '#types';

export const ComputerOperationHandlerSet = OperationHandlerSet.lazy([
  ComputerOperation.Bash.pipe(Operation.lazyHandler(() => import('./bash.ts'))),
  ComputerOperation.Edits.pipe(Operation.lazyHandler(() => import('./edits.ts'))),
]);
