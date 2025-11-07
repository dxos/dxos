//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { Function, Trigger } from '@dxos/functions-runtime';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, ComputeRuntime, IntentResolver, ReactSurface } from './capabilities';
import { AutomationEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';

export const AutomationPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [Function.Function, Trigger.Trigger]),
  }),
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/compute-runtime`,
    activatesOn: ClientEvents.ClientReady,
    activatesAfter: [AutomationEvents.ComputeRuntimeReady],
    activate: ComputeRuntime,
  }),
]);
