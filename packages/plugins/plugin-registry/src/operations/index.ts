//
// Copyright 2025 DXOS.org
//

import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DisablePlugins, EnablePlugins, QueryDisabledPlugins, QueryPlugins } from './definitions.ts';

export * as RegistryOperation from './definitions.ts';

export const RegistryOperationHandlerSet = OperationHandlerSet.lazy([
  SettingsOperation.OpenPluginRegistry.pipe(Operation.lazyHandler(() => import('./open-plugin-registry.ts'))),
  QueryPlugins.pipe(Operation.lazyHandler(() => import('./query-plugins.ts'))),
  QueryDisabledPlugins.pipe(Operation.lazyHandler(() => import('./query-disabled-plugins.ts'))),
  EnablePlugins.pipe(Operation.lazyHandler(() => import('./enable-plugins.ts'))),
  DisablePlugins.pipe(Operation.lazyHandler(() => import('./disable-plugins.ts'))),
]);
