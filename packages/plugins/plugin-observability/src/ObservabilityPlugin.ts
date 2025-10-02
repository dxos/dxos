//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, allOf, contributes, defineModule, definePlugin } from '@dxos/app-framework';
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

export const ObservabilityPlugin = definePlugin<ObservabilityPluginOptions>(meta, ({ namespace, observability }) => [
  defineModule({
    id: `${meta.id}/module/observability`,
    activatesOn: Events.Startup,
    activate: async () => contributes(ObservabilityCapabilities.Observability, await observability()),
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
    activate: () => ObservabilityState({ namespace }),
  }),
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: (context) => IntentResolver({ context, namespace }),
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
      return ClientReady({ context, observability: await observability(), namespace });
    },
  }),
]);
