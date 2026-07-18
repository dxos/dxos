//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
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
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addNavigationResolverModule({
    requires: NavigationResolver.requires,
    provides: NavigationResolver.provides,
    activate: NavigationResolver,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  AppPlugin.addSchemaModule({
    schema: [Routine.Routine, Operation.PersistentOperation, Instructions.Instructions, Trigger.Trigger, Trace.Message],
  }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  // Dependency-mode: the specs resolve services (client, database, ...) lazily at
  // slice-materialisation time, so activation needs nothing — and providing
  // Capabilities.LayerSpec soft-orders this module before the process-manager snapshot.
  Plugin.addLazyModule(LayerSpecs),
  Plugin.addLazyModule(RegistrySync),
  // CreateRoutine (in OperationHandler) resolves RoutineCapabilities.Template, so the template
  // provider must be present wherever the handler is exported.
  Plugin.addLazyModule(Templates),
  Plugin.addLazyModule(TriggerRuntimeController),
  Plugin.make,
);

export default RoutinePlugin;
