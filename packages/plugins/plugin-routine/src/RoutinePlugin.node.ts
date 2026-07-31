//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';

import {
  AppGraphBuilder,
  LayerSpecs,
  OperationHandler,
  RegistrySync,
  Templates,
  TriggerRuntimeController,
} from '#capabilities';
import { meta } from '#meta';

import { trigger } from './commands';

export const RoutinePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(AppCapability.commands([trigger])),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(
    AppCapability.schema([Routine.Routine, Operation.PersistentOperation, Trigger.Trigger, Trace.Message]),
  ),
  // CreateRoutine (in OperationHandler) resolves RoutineCapabilities.Template, so the template
  // provider must be present wherever the handler is exported.
  Plugin.addModule(Templates),
  Plugin.addModule(LayerSpecs),
  Plugin.addModule(RegistrySync),
  Plugin.addModule(TriggerRuntimeController),
  Plugin.make,
);

export default RoutinePlugin;
