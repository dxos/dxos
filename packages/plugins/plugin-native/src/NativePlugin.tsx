//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, Plugin, Capability } from '@dxos/app-framework';
import { AssistantEvents } from '@dxos/plugin-assistant';

import { Ollama, Updater, Window } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const NativePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'updater',
    activatesOn: Events.DispatcherReady,
    activate: Updater,
  }),
  Plugin.addModule({
    id: 'window',
    activatesOn: Events.DispatcherReady,
    activate: Window,
  }),
  Plugin.addModule({
    id: 'ollama',
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: Ollama,
  }),
  Plugin.make,
);
