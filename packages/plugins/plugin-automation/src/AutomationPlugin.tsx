//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, Capability, Plugin } from '@dxos/app-framework';
import { Function, Trigger } from '@dxos/functions';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, ComputeRuntime, IntentResolver, ReactSurface } from './capabilities';
import { AutomationEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';

export const AutomationPlugin = Plugin.define(meta)
  .pipe(
    Plugin.addModule({
      id: 'translations',
      activatesOn: Events.SetupTranslations,
      activate: () => Capability.contributes(Capabilities.Translations, translations),
    }),
    Plugin.addModule({
      id: 'schema',
      activatesOn: ClientEvents.SetupSchema,
      activate: () => Capability.contributes(ClientCapabilities.Schema, [Function.Function, Trigger.Trigger]),
    }),
    Plugin.addModule({
      id: 'app-graph-builder',
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    Plugin.addModule({
      id: 'intent-resolver',
      activatesOn: Events.SetupIntentResolver,
      activate: IntentResolver,
    }),
    Plugin.addModule({
      id: 'react-surface',
      activatesOn: Events.SetupReactSurface,
      activate: ReactSurface,
    }),
    Plugin.addModule({
      id: 'compute-runtime',
      activatesOn: ClientEvents.ClientReady,
      activatesAfter: [AutomationEvents.ComputeRuntimeReady],
      activate: ComputeRuntime,
    }),
    Plugin.make,
  );
