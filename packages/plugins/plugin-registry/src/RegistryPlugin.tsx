//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, defineModule, definePlugin, Events } from '@dxos/app-framework';

import { ReactSurface, RegistrySettings } from './capabilities';
import { meta } from './meta';
import translations from './translations';

export const RegistryPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: RegistrySettings,
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
  ]);
