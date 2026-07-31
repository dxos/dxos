//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ScriptOperation } from '../types';

export const ScriptOperationHandlerSet = OperationHandlerSet.keyed([
  [ScriptOperation.CreateScript, () => import('./create-script')],
]);
