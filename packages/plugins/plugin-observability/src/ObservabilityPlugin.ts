//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Capability, Common, Plugin } from '@dxos/app-framework';
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
    activatesOn: Common.ActivationEvent.Startup,
    activate: async () => Capability.contributes(ObservabilityCapabilities.Observability, await observability()),
  })),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: ObservabilitySettings,
  }),
  Plugin.addModule(({ namespace }) => ({
    id: Capability.getModuleTag(ObservabilityState),
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [ObservabilityEvents.StateReady],
    activate: () => ObservabilityState({ namespace }),
  })),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Common.ActivationEvent.SetupTranslations,
    activate: () => Capability.contributes(Common.Capability.Translations, translations),
  }),
  Plugin.addModule(({ namespace }) => ({
    id: Capability.getModuleTag(IntentResolver),
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: (context) => IntentResolver({ context, namespace }),
  })),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.addModule(({ namespace, observability }) => ({
    id: Capability.getModuleTag(ClientReady),
    activatesOn: ActivationEvent.allOf(
      Common.ActivationEvent.DispatcherReady,
      ObservabilityEvents.StateReady,
      ClientReadyEvent,
    ),
    activate: async (context) => {
      return ClientReady({ context, namespace, observability: await observability() });
    },
  })),
  Plugin.make,
);
