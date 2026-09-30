//
// Copyright 2025 DXOS.org
//

import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DisablePlugins, EnablePlugins, LoadPlugin, QueryDisabledPlugins, QueryPlugins } from './definitions.ts';

export * as RegistryOperation from './definitions.ts';
export { describeLoadError } from './describe-load-error.ts';

export const RegistryOperationHandlerSet = OperationHandlerSet.lazy([
  SettingsOperation.OpenPluginRegistry.pipe(Operation.lazyHandler(() => import('./open-plugin-registry.ts'))),
  QueryPlugins.pipe(Operation.lazyHandler(() => import('./query-plugins.ts'))),
  QueryDisabledPlugins.pipe(Operation.lazyHandler(() => import('./query-disabled-plugins.ts'))),
  EnablePlugins.pipe(Operation.lazyHandler(() => import('./enable-plugins.ts'))),
  DisablePlugins.pipe(Operation.lazyHandler(() => import('./disable-plugins.ts'))),
  LoadPlugin.pipe(Operation.lazyHandler(() => import('./load-plugin.ts'))),
]);
