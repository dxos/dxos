//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation, Trace, Trigger } from '@dxos/compute';
import { ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, LayerSpecs, OperationHandler, TriggerRuntimeController } from '#capabilities';
import { meta } from '#meta';

import { trigger } from './commands';

export const AutomationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addCommandModule({ commands: [trigger] }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Operation.PersistentOperation, Trigger.Trigger, Trace.Message] }),
  Plugin.addModule({
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: LayerSpecs,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ActivationEvents.ProcessManagerReady, ClientEvents.SpacesReady),
    activate: TriggerRuntimeController,
  }),
  Plugin.make,
);

export default AutomationPlugin;
