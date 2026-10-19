//
// Copyright 2025 DXOS.org
//

import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as RegistryOperation from '../types/RegistryOperation.ts';

export * as RegistryOperation from '../types/RegistryOperation.ts';
export { describeLoadError } from './describe-load-error.ts';

export const RegistryOperationHandlerSet = OperationHandlerSet.lazy([
  SettingsOperation.OpenPluginRegistry.pipe(Operation.lazyHandler(() => import('./open-plugin-registry.ts'))),
  RegistryOperation.QueryPlugins.pipe(Operation.lazyHandler(() => import('./query-plugins.ts'))),
  RegistryOperation.QueryDisabledPlugins.pipe(Operation.lazyHandler(() => import('./query-disabled-plugins.ts'))),
  RegistryOperation.EnablePlugins.pipe(Operation.lazyHandler(() => import('./enable-plugins.ts'))),
  RegistryOperation.DisablePlugins.pipe(Operation.lazyHandler(() => import('./disable-plugins.ts'))),
  RegistryOperation.LoadPlugin.pipe(Operation.lazyHandler(() => import('./load-plugin.ts'))),
]);
