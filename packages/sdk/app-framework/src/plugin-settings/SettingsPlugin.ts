//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events } from '../common';
import { Capability, Plugin } from '../core';

import { meta } from './meta';
import { translations } from './translations';

const SettingsStore = Capability.lazy('SettingsStore', () => import('./store'));
const SettingsIntentResolver = Capability.lazy('SettingsIntentResolver', () => import('./intent-resolver'));
const SettingsAppGraphBuilder = Capability.lazy('SettingsAppGraphBuilder', () => import('./app-graph-builder'));

export const SettingsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: Events.Startup,
    activatesBefore: [Events.SetupSettings],
    activatesAfter: [Events.SettingsReady],
    activate: SettingsStore,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    activatesOn: Events.SetupIntentResolver,
    activate: SettingsIntentResolver,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupAppGraph,
    activate: SettingsAppGraphBuilder,
  }),
  Plugin.make,
);
