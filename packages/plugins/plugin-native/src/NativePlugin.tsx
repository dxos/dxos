//
// Copyright 2023 DXOS.org
//

import { definePlugin, Events, defineModule, contributes, Capabilities } from '@dxos/app-framework';

import { Updater } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const NativePlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/updater`,
      activatesOn: Events.DispatcherReady,
      activate: Updater,
    }),
  ]);
