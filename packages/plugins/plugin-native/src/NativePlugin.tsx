//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AssistantEvents } from '@dxos/plugin-assistant';

import { Ollama, Updater, Window } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const NativePlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'updater',
    activatesOn: ActivationEvents.OperationInvokerReady,
    activate: Updater,
  }),
  Plugin.addModule({
    id: 'window',
    activatesOn: ActivationEvents.OperationInvokerReady,
    activate: Window,
  }),
  Plugin.addModule({
    id: 'ollama',
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: Ollama,
  }),
  Plugin.make,
);
