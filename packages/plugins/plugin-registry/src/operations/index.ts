//
// Copyright 2025 DXOS.org
//

import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const RegistryOperationHandlerSet = OperationHandlerSet.keyed([
  [SettingsOperation.OpenPluginRegistry, () => import('./open-plugin-registry')],
]);
