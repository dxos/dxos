//
// Copyright 2025 DXOS.org
//

import * as Common from '../common';
import { Capability, Plugin } from '../core';

import { meta } from './meta';
import { translations } from './translations';

const SettingsStore = Capability.lazy('SettingsStore', () => import('./store'));
const SettingsIntentResolver = Capability.lazy('SettingsIntentResolver', () => import('./intent-resolver'));
const SettingsAppGraphBuilder = Capability.lazy('SettingsAppGraphBuilder', () => import('./app-graph-builder'));

export const SettingsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activatesBefore: [Common.ActivationEvent.SetupSettings],
    activatesAfter: [Common.ActivationEvent.SettingsReady],
    activate: SettingsStore,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Common.ActivationEvent.SetupTranslations,
    activate: () => Capability.contributes(Common.Capability.Translations, translations),
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: SettingsIntentResolver,
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupAppGraph,
    activate: SettingsAppGraphBuilder,
  }),
  Plugin.make,
);
