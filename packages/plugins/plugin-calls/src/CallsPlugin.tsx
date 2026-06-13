//
// Copyright 2026 DXOS.org
//

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';

import {
  AppGraphBuilder,
  CallExtension,
  CallManager,
  CallRecordState,
  CallSettings,
  OperationHandler,
  ReactRoot,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Call, CallsCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

const StateReady = AppActivationEvents.createStateEvent(meta.id);
const SettingsReady = AppActivationEvents.createSettingsEvent(CallsCapabilities.Settings.identifier);

export const CallsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Call.Call] }),
  AppPlugin.addReactRootModule({ activate: ReactRoot }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'call-manager',
    activatesOn: ClientEvents.ClientReady,
    activate: CallManager,
  }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    firesAfterActivation: [SettingsReady],
    activate: CallSettings,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.oneOf(AppActivationEvents.SetupSettings, AppActivationEvents.SetupAppGraph),
    firesAfterActivation: [StateReady],
    activate: CallRecordState,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(SettingsReady, StateReady),
    activate: CallExtension,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default CallsPlugin;
