//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ScriptOperation from '../types/ScriptOperation';

export const ScriptOperationHandlerSet = OperationHandlerSet.keyed([
  [ScriptOperation.CreateScript, () => import('./create-script')],
]);
