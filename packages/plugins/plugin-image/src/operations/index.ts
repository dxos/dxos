//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const ImageOperationHandlerSet = OperationHandlerSet.lazy(() => import('./generate-image'));
