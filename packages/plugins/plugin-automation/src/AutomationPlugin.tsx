//
// Copyright 2023 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';
import { Function, Trigger } from '@dxos/functions';
import { ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, ComputeRuntime, IntentResolver, OperationHandler, ReactSurface } from './capabilities';
import { AutomationEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';

export const AutomationPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addSchemaModule({ schema: [Function.Function, Trigger.Trigger] }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addOperationHandlerModule({ activate: OperationHandler }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.addModule({
    id: 'compute-runtime',
    activatesOn: ClientEvents.ClientReady,
    activatesAfter: [AutomationEvents.ComputeRuntimeReady],
    activate: ComputeRuntime,
  }),
  Plugin.make,
);
