//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { AssistantEvents } from '@dxos/plugin-assistant';

import { Ollama, Updater, Window } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const NativePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Common.ActivationEvent.SetupTranslations,
    activate: () => Capability.contributes(Common.Capability.Translations, translations),
  }),
  Plugin.addModule({
    id: 'updater',
    activatesOn: Common.ActivationEvent.DispatcherReady,
    activate: Updater,
  }),
  Plugin.addModule({
    id: 'window',
    activatesOn: Common.ActivationEvent.DispatcherReady,
    activate: Window,
  }),
  Plugin.addModule({
    id: 'ollama',
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: Ollama,
  }),
  Plugin.make,
);
