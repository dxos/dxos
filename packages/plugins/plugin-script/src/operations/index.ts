//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { ScriptOperation } from '../types';

export const ScriptOperationHandlerSet = OperationHandlerSet.keyed([
  [ScriptOperation.CreateScript, () => import('./create-script')],
]);
