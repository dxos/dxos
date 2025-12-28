//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Capabilities, Capability, Events, Plugin } from '@dxos/app-framework';
import { type Observability } from '@dxos/observability';

import {
  AppGraphBuilder,
  ClientReady,
  IntentResolver,
  ObservabilityCapabilities,
  ObservabilitySettings,
  ObservabilityState,
  ReactSurface,
} from './capabilities';
import { ClientReadyEvent, ObservabilityEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';

export type ObservabilityPluginOptions = {
  namespace: string;
  observability: () => Promise<Observability>;
};

export const ObservabilityPlugin = Plugin.define<ObservabilityPluginOptions>(meta).pipe(
  Plugin.addModule(({ namespace, observability }) => ({
    id: 'observability',
    activatesOn: Events.Startup,
    activate: async () => Capability.contributes(ObservabilityCapabilities.Observability, await observability()),
  })),
  Plugin.addModule({
    activatesOn: Events.SetupSettings,
    activate: ObservabilitySettings,
  }),
  Plugin.addModule(({ namespace }) => ({
    id: Capability.getModuleTag(ObservabilityState),
    activatesOn: Events.Startup,
    activatesAfter: [ObservabilityEvents.StateReady],
    activate: () => ObservabilityState({ namespace }),
  })),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule(({ namespace }) => ({
    id: Capability.getModuleTag(IntentResolver),
    activatesOn: Events.SetupIntentResolver,
    activate: (context) => IntentResolver({ context, namespace }),
  })),
  Plugin.addModule({
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.addModule(({ namespace, observability }) => ({
    id: Capability.getModuleTag(ClientReady),
    activatesOn: ActivationEvent.allOf(Events.DispatcherReady, ObservabilityEvents.StateReady, ClientReadyEvent),
    activate: async (context: Capability.PluginContext) => {
      return ClientReady({ context, observability: await observability(), namespace });
    },
  })),
  Plugin.make,
);
