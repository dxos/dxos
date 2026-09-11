//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ScriptOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  ScriptOperation.CreateScript.pipe(Operation.lazyHandler(() => import('./create-script.ts'))),
]);
