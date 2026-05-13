//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation, Trace, Trigger } from '@dxos/compute';
import { ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, ComputeRuntime, LayerSpecs, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { AutomationEvents } from '#types';

export const AutomationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Operation.PersistentOperation, Trigger.Trigger, Trace.Message] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    firesAfterActivation: [AutomationEvents.ComputeRuntimeReady],
    activate: ComputeRuntime,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    firesBeforeActivation: [ActivationEvents.SetupLayer],
    activate: LayerSpecs,
  }),
  Plugin.make,
);

export default AutomationPlugin;
