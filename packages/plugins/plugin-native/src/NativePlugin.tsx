//
// Copyright 2023 DXOS.org
//

import { definePlugin, Events, defineModule, contributes, Capabilities } from '@dxos/app-framework';

import { Updater, Ollama } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { AssistantActivationEvents } from '@dxos/plugin-assistant';

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
    defineModule({
      id: `${meta.id}/module/ollama`,
      // TODO(dmaretskyi): Should we do a custom activation event?
      activatesOn: Events.Startup,
      activateAfter: [AssistantActivationEvents.AiServiceProvidersReady],
      activate: Ollama,
    }),
  ]);
