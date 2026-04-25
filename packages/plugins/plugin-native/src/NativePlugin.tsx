//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AssistantEvents } from '@dxos/plugin-assistant';

import { NativeSettings, Ollama, ReactSurface, SpotlightListener, SpotlightShortcut, Updater } from '#capabilities';
import { meta } from '#meta';

import { translations } from './translations';

export const NativePlugin = Plugin.define(meta).pipe(
  AppPlugin.addSettingsModule({ activate: NativeSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'spotlight-listener',
    activatesOn: ActivationEvents.OperationInvokerReady,
    activate: SpotlightListener,
  }),
  Plugin.addModule({
    id: 'spotlight-shortcut',
    activatesOn: ActivationEvents.OperationInvokerReady,
    activate: SpotlightShortcut,
  }),
  Plugin.addModule({
    id: 'updater',
    activatesOn: ActivationEvents.OperationInvokerReady,
    activate: Updater,
  }),
  Plugin.addModule({
    id: 'ollama',
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: Ollama,
  }),
  Plugin.make,
);
