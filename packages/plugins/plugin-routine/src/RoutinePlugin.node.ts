//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation, Trace, Trigger } from '@dxos/compute';

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
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addCommandModule({ commands: [trigger] }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({
    schema: [Routine.Routine, Operation.PersistentOperation, Trigger.Trigger, Trace.Message],
  }),
  // CreateRoutine (in OperationHandler) resolves RoutineCapabilities.Template, so the template
  // provider must be present wherever the handler is exported.
  Plugin.addLazyModule(Templates),
  Plugin.addLazyModule(LayerSpecs),
  Plugin.addLazyModule(RegistrySync),
  Plugin.addLazyModule(TriggerRuntimeController),
  Plugin.make,
);

export default RoutinePlugin;
