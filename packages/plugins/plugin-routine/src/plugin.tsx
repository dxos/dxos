//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import {
  AppGraphBuilder,
  Commands,
  CreateObject,
  LayerSpecs,
  OperationHandler,
  ReactSurface,
  RegistrySync,
  Schema,
  Templates,
  TriggerRuntimeController,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const RoutinePlugin = Plugin.define(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  Plugin.addModule(Commands),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.addModule(Schema),
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
