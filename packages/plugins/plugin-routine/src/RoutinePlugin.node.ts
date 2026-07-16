//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation, Trace, Trigger } from '@dxos/compute';
import { ClientEvents } from '@dxos/plugin-client';

import {
  AppGraphBuilder,
  LayerSpecs,
  OperationHandler,
  RegistrySync,
  Templates,
  TriggerRuntimeController,
} from '#capabilities';
import { meta } from '#meta';
import { Routine } from '#types';

import { trigger } from './commands';

export const RoutinePlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addCommandModule({ commands: [trigger] }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Routine.Routine, Operation.PersistentOperation, Trigger.Trigger, Trace.Message],
  }),
  // CreateRoutine (in OperationHandler) resolves RoutineCapabilities.Template, so the template
  // provider must be present wherever the handler is exported.
  Plugin.addModule({ id: 'automation-templates', activatesOn: AppActivationEvents.SetupSchema, activate: Templates }),
  Plugin.addLazyModule(LayerSpecs),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activate: RegistrySync,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ActivationEvents.ProcessManagerReady, ClientEvents.SpacesReady),
    activate: TriggerRuntimeController,
  }),
  Plugin.make,
);

export default RoutinePlugin;
