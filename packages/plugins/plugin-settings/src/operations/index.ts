//
// Copyright 2025 DXOS.org
//

import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const SettingsOperationHandlerSet = OperationHandlerSet.keyed([
  [SettingsOperation.Open, () => import('./open')],
  [SettingsOperation.OpenPluginRegistry, () => import('./open-plugin-registry')],
]);
