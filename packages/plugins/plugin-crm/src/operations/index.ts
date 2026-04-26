//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export { AttachImage } from './definitions';

export const CrmHandlers = OperationHandlerSet.lazy(() => import('./attach-image'));
