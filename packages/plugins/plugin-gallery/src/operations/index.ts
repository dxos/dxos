//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const GalleryOperationHandlerSet = OperationHandlerSet.lazy(() => import('./describe-image'));
