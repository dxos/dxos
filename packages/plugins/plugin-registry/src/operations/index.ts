//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export const RegistryOperationHandlerSet = OperationHandlerSet.lazy(() => import('./open-plugin-registry'));
