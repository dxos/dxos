//
// Copyright 2025 DXOS.org
//

import * as Common from '../common';
import { Capability, Plugin } from '../core';

import { meta } from './meta';
import { translations } from './translations';

const SettingsOperationResolver = Capability.lazy('SettingsOperationResolver', () => import('./operation-resolver'));
const SettingsAppGraphBuilder = Capability.lazy('SettingsAppGraphBuilder', () => import('./app-graph-builder'));

export const SettingsPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addOperationResolverModule({ activate: SettingsOperationResolver }),
  Common.Plugin.addAppGraphModule({ activate: SettingsAppGraphBuilder }),
  Plugin.make,
);
