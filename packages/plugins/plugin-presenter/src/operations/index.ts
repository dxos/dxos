//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const PresenterOperationHandlerSet = OperationHandlerSet.lazy(() => import('./toggle-presentation'));
