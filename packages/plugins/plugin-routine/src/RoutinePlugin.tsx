//
// Copyright 2023 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin, AppActivationEvents } from '@dxos/app-toolkit';
import { Operation, Instructions, Trace, Trigger } from '@dxos/compute';
import { ClientEvents } from '@dxos/plugin-client';

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
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addNavigationResolverModule({ activatesOn: ClientEvents.ClientReady, activate: NavigationResolver }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  AppPlugin.addSchemaModule({
    schema: [Routine.Routine, Operation.PersistentOperation, Instructions.Instructions, Trigger.Trigger, Trace.Message],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    firesBeforeActivation: [ActivationEvents.SetupProcessManager],
    activate: LayerSpecs,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activate: RegistrySync,
  }),
  Plugin.addModule({ activatesOn: AppActivationEvents.SetupSchema, activate: Templates }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ActivationEvents.ProcessManagerReady, ClientEvents.SpacesReady),
    activate: TriggerRuntimeController,
  }),
  Plugin.make,
);

export default RoutinePlugin;
