//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Function, Trigger } from '@dxos/functions';
import { ClientEvents } from '@dxos/plugin-client/types';

import { AppGraphBuilder, ComputeRuntime, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { AutomationEvents } from './types';

export const AutomationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Function.Function, Trigger.Trigger] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activatesAfter: [AutomationEvents.ComputeRuntimeReady],
    activate: ComputeRuntime,
  }),
  Plugin.make,
);
