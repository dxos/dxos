//
// Copyright 2023 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';
import { AssistantEvents } from '@dxos/plugin-assistant';

import { Ollama, Updater, Window } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const NativePlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'updater',
    activatesOn: Common.ActivationEvent.OperationInvokerReady,
    activate: Updater,
  }),
  Plugin.addModule({
    id: 'window',
    activatesOn: Common.ActivationEvent.OperationInvokerReady,
    activate: Window,
  }),
  Plugin.addModule({
    id: 'ollama',
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: Ollama,
  }),
  Plugin.make,
);
