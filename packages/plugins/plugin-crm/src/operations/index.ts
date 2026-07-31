//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { CrmOperation } from '../types';

export const CrmOperationHandlerSet = OperationHandlerSet.keyed([
  [CrmOperation.AttachImage, () => import('./attach-image')],
]);
