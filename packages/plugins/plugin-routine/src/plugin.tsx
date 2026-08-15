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

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
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
  Plugin.addModule(ReactSurface),
  Plugin.addModule(RegistrySync),
  Plugin.addModule(Schema),
  // CreateRoutine (in OperationHandler) resolves RoutineCapabilities.Template, so the template
  // provider must be present wherever the handler is exported.
  Plugin.addModule(Templates),
  Plugin.addModule(TriggerRuntimeController),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default RoutinePlugin;
