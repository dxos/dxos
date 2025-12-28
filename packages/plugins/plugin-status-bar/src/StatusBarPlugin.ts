//
// Copyright 2024 DXOS.org
//

import { Capabilities, Events, Capability, Plugin } from '@dxos/app-framework';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const StatusBarPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.make,
);
