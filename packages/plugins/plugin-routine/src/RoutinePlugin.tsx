//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Instructions, Operation, Trace, Trigger } from '@dxos/compute';

import {
  AppGraphBuilder,
  CreateObject,
  LayerSpecs,
  NavigationResolver,
  OperationHandler,
  ReactSurface,
  RegistrySync,
  Templates,
  TriggerRuntimeController,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Routine } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const RoutinePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(NavigationResolver),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.addModule(
    AppCapability.schema([
      Routine.Routine,
      Operation.PersistentOperation,
      Instructions.Instructions,
      Trigger.Trigger,
      Trace.Message,
    ]),
  ),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  // Dependency-mode: the specs resolve services (client, database, ...) lazily at
  // slice-materialisation time, so activation needs nothing — and providing
  // Capabilities.LayerSpec soft-orders this module before the process-manager snapshot.
  Plugin.addModule(LayerSpecs),
  Plugin.addModule(RegistrySync),
  // CreateRoutine (in OperationHandler) resolves RoutineCapabilities.Template, so the template
  // provider must be present wherever the handler is exported.
  Plugin.addModule(Templates),
  Plugin.addModule(TriggerRuntimeController),
  Plugin.make,
);

export default RoutinePlugin;
