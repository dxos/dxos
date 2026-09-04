//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  Commands,
  CreateObject,
  LayerSpecs,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  RegistrySync,
  Schema,
  Templates,
  Translations,
  TriggerRuntimeController,
} from '#capabilities';
import { meta } from '#meta';

export const RoutinePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  // TODO(wittjosiah): Could some of these commands make use of operations?
  Plugin.addModule(Commands),
  Plugin.addModule(CreateObject),
  // Dependency-mode: the specs resolve services (client, database, ...) lazily at
  // slice-materialisation time, so activation needs nothing — and providing
  // Capabilities.LayerSpec soft-orders this module before the process-manager snapshot.
  Plugin.addModule(LayerSpecs),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(RegistrySync),
  Plugin.addModule(Schema),
  // CreateRoutine (in OperationHandler) resolves RoutineCapabilities.Template, so the template
  // provider must be present wherever the handler is exported.
  Plugin.addModule(Templates),
  Plugin.addModule(Translations),
  Plugin.addModule(TriggerRuntimeController),
  Plugin.make,
);

export default RoutinePlugin;
