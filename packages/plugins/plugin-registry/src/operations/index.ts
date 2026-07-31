//
// Copyright 2025 DXOS.org
//

import { SettingsOperation } from '@dxos/app-toolkit';
import { OperationHandlerSet } from '@dxos/compute';

export const RegistryOperationHandlerSet = OperationHandlerSet.keyed([
  [SettingsOperation.OpenPluginRegistry, () => import('./open-plugin-registry')],
]);
