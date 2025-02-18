//
// Copyright 2023 DXOS.org
//

import { Events, defineModule, definePlugin, contributes, Capabilities } from '@dxos/app-framework';

import { AppGraphBuilder, IntentResolver, ManagerState, ReactSurface } from './capabilities';
import meta from './meta';
import translations from './translations';

/**
 * Plugin for aggregating and rendering plugin settings.
 */
export const SettingsInterfacePlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/state`,
      activatesOn: Events.Startup,
      activate: ManagerState,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
  ]);
