//
// Copyright 2025 DXOS.org
//

import { allOf, Capabilities, contributes, defineModule, definePlugin, Events } from '@dxos/app-framework';
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
import { ObservabilityEvents, ClientReadyEvent } from './events';
import { meta } from './meta';
import { translations } from './translations';

export const ObservabilityPlugin = (options: { namespace: string; observability: () => Promise<Observability> }) =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/observability`,
      activatesOn: Events.Startup,
      activate: async () => contributes(ObservabilityCapabilities.Observability, await options.observability()),
    }),
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: ObservabilitySettings,
    }),
    defineModule({
      id: `${meta.id}/module/state`,
      activatesOn: Events.Startup,
      activatesAfter: [ObservabilityEvents.StateReady],
      activate: () => ObservabilityState({ namespace: options.namespace }),
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: (context) => IntentResolver({ context, namespace: options.namespace }),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/client-ready`,
      activatesOn: allOf(Events.DispatcherReady, ObservabilityEvents.StateReady, ClientReadyEvent),
      activate: async (context) => {
        const observability = await options.observability();
        return ClientReady({ context, observability, namespace: options.namespace });
      },
    }),
  ]);
