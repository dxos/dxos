//
// Copyright 2025 DXOS.org
//

import * as Common from '../common';
import { Capability, Plugin } from '../core';

import { meta } from './meta';
import { translations } from './translations';

const SettingsStore = Capability.lazy('SettingsStore', () => import('./store'));
const SettingsOperationResolver = Capability.lazy('SettingsOperationResolver', () => import('./operation-resolver'));
const SettingsAppGraphBuilder = Capability.lazy('SettingsAppGraphBuilder', () => import('./app-graph-builder'));

export const SettingsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activatesBefore: [Common.ActivationEvent.SetupSettings],
    activatesAfter: [Common.ActivationEvent.SettingsReady],
    activate: SettingsStore,
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addOperationResolverModule({ activate: SettingsOperationResolver }),
  Common.Plugin.addAppGraphModule({ activate: SettingsAppGraphBuilder }),
  Plugin.make,
);
