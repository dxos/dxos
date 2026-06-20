//
// Copyright 2023 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin, AppActivationEvents } from '@dxos/app-toolkit';
import { Operation, Trace, Trigger } from '@dxos/compute';
import { ClientEvents } from '@dxos/plugin-client';

import {
  AppGraphBuilder,
  CreateObject,
  LayerSpecs,
  OperationHandler,
  ReactSurface,
  RegistrySync,
  Templates,
  TriggerRuntimeController,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Automation } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const AutomationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Automation.Automation, Operation.PersistentOperation, Trigger.Trigger, Trace.Message],
  }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  Plugin.addModule({ id: 'automation-templates', activatesOn: AppActivationEvents.SetupSchema, activate: Templates }),
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
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ActivationEvents.ProcessManagerReady, ClientEvents.SpacesReady),
    activate: TriggerRuntimeController,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default AutomationPlugin;
