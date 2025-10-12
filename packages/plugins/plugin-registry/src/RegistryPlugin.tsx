//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';

import { AppGraphBuilder, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const RegistryPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
]);
