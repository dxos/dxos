//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Trigger } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { ClientEvents } from '@dxos/plugin-client/types';

import { meta } from './meta';
import { translations } from './translations';
import { AutomationEvents } from '#types';

import { AppGraphBuilder, ComputeRuntime, OperationHandler, ReactSurface } from '#capabilities';

export const AutomationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Operation.PersistentOperation, Trigger.Trigger] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activatesAfter: [AutomationEvents.ComputeRuntimeReady],
    activate: ComputeRuntime,
  }),
  Plugin.make,
);
