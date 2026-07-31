//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CrmOperation } from '../types';

export const CrmOperationHandlerSet = OperationHandlerSet.keyed([
  [CrmOperation.AttachImage, () => import('./attach-image')],
]);
