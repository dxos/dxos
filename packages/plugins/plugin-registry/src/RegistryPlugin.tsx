//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, Capability, Plugin } from '@dxos/app-framework';

import { AppGraphBuilder, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const RegistryPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.make,
);
