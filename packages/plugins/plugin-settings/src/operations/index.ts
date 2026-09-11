//
// Copyright 2025 DXOS.org
//

import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const SettingsOperationHandlerSet = OperationHandlerSet.lazy([
  SettingsOperation.Open.pipe(Operation.lazyHandler(() => import('./open.ts'))),
  SettingsOperation.OpenPluginRegistry.pipe(Operation.lazyHandler(() => import('./open-plugin-registry.ts'))),
]);
