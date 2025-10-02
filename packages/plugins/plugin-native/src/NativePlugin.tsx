//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { AssistantEvents } from '@dxos/plugin-assistant';

import { Ollama, Updater, Window } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const NativePlugin = definePlugin(meta, () => [
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
    id: `${meta.id}/module/window`,
    activatesOn: Events.DispatcherReady,
    activate: Window,
  }),
  defineModule({
    id: `${meta.id}/module/ollama`,
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: Ollama,
  }),
]);
