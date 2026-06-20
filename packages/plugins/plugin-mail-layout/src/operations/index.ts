//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const MailLayoutOperationHandlerSet = OperationHandlerSet.lazy(() => import('./update-companion'));
