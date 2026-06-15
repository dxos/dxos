//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const SettingsOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./open'),
  () => import('./open-plugin-registry'),
);
