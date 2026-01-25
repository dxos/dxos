//
// Copyright 2023 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';
import { Function, Trigger } from '@dxos/functions';
import { ClientEvents } from '@dxos/plugin-client/types';

import { AppGraphBuilder, ComputeRuntime, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { AutomationEvents } from './types';

export const AutomationPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addSchemaModule({ schema: [Function.Function, Trigger.Trigger] }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activatesAfter: [AutomationEvents.ComputeRuntimeReady],
    activate: ComputeRuntime,
  }),
  Plugin.make,
);
