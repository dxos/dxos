//
// Copyright 2025 DXOS.org
//

import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { QueryPlugins } from './definitions';

export * as RegistryOperation from './definitions';

export const RegistryOperationHandlerSet = OperationHandlerSet.lazy([
  SettingsOperation.OpenPluginRegistry.pipe(Operation.lazyHandler(() => import('./open-plugin-registry'))),
  QueryPlugins.pipe(Operation.lazyHandler(() => import('./query-plugins'))),
]);
