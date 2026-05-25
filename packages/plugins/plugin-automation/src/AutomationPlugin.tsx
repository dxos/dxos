//
// Copyright 2023 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation, Trace, Trigger } from '@dxos/compute';
import { ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, LayerSpecs, OperationHandler, ReactSurface, TriggerRuntimeController } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const AutomationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Operation.PersistentOperation, Trigger.Trigger, Trace.Message] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    firesBeforeActivation: [ActivationEvents.SetupProcessManager],
    activate: LayerSpecs,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ActivationEvents.ProcessManagerReady, ClientEvents.SpacesReady),
    activate: TriggerRuntimeController,
  }),
  Plugin.make,
);

export default AutomationPlugin;
