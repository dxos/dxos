//
// Copyright 2025 DXOS.org
//

import { SettingsOperation } from '@dxos/app-toolkit';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const RegistryOperationHandlerSet = OperationHandlerSet.keyed([
  [SettingsOperation.OpenPluginRegistry, () => import('./open-plugin-registry')],
]);
