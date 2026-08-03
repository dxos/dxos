//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as CrmOperation from '../types/CrmOperation';

export const CrmOperationHandlerSet = OperationHandlerSet.keyed([
  [CrmOperation.AttachImage, () => import('./attach-image')],
]);
