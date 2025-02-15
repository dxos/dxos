//
// Copyright 2025 DXOS.org
//

import { SETTINGS_PLUGIN } from './actions';
import translations from './translations';
import { Capabilities, Events } from '../common';
import { contributes, defineModule, definePlugin, lazy } from '../core';

// TODO(wittjosiah): Add options to exclude some modules.
export const SettingsPlugin = () =>
  definePlugin({ id: SETTINGS_PLUGIN }, [
    defineModule({
      id: `${SETTINGS_PLUGIN}/module/store`,
      activatesOn: Events.Startup,
      activatesBefore: [Events.SetupSettings],
      activatesAfter: [Events.SettingsReady],
      activate: lazy(() => import('./store')),
    }),
    defineModule({
      id: `${SETTINGS_PLUGIN}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${SETTINGS_PLUGIN}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: lazy(() => import('./intent-resolver')),
    }),
    defineModule({
      id: `${SETTINGS_PLUGIN}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: lazy(() => import('./app-graph-builder')),
    }),
  ]);
