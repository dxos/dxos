//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { Function, Trigger } from '@dxos/functions';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, ComputeRuntime, IntentResolver, ReactSurface } from './capabilities';
import { AutomationEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';

export const AutomationPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Function.Function, Trigger.Trigger]),
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.addModule({
    id: 'compute-runtime',
    activatesOn: ClientEvents.ClientReady,
    activatesAfter: [AutomationEvents.ComputeRuntimeReady],
    activate: ComputeRuntime,
  }),
  Plugin.make,
);
