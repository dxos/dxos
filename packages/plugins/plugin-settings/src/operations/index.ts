//
// Copyright 2025 DXOS.org
//

import { SettingsOperation } from '@dxos/app-toolkit';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const SettingsOperationHandlerSet = OperationHandlerSet.keyed([
  [SettingsOperation.Open, () => import('./open')],
  [SettingsOperation.OpenPluginRegistry, () => import('./open-plugin-registry')],
]);
