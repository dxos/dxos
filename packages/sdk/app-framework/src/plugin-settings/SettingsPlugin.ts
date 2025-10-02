//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events } from '../common';
import { contributes, defineModule, definePlugin, lazy } from '../core';

import { meta } from './meta';
import { translations } from './translations';

export const SettingsPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/store`,
    activatesOn: Events.Startup,
    activatesBefore: [Events.SetupSettings],
    activatesAfter: [Events.SettingsReady],
    activate: lazy(() => import('./store')),
  }),
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: lazy(() => import('./intent-resolver')),
  }),
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: lazy(() => import('./app-graph-builder')),
  }),
]);
