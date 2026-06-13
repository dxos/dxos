//
// Copyright 2023 DXOS.org
//

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import {
  AppGraphBuilder,
  CallExtension,
  MeetingSettings,
  MeetingState,
  OperationHandler,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Meeting, MeetingCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

const StateReady = AppActivationEvents.createStateEvent(meta.id);
const SettingsReady = AppActivationEvents.createSettingsEvent(MeetingCapabilities.Settings.identifier);

export const MeetingPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Meeting.Meeting] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    firesAfterActivation: [SettingsReady],
    activate: MeetingSettings,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: ActivationEvent.oneOf(AppActivationEvents.SetupSettings, AppActivationEvents.SetupAppGraph),
    firesAfterActivation: [StateReady],
    activate: MeetingState,
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

export default MeetingPlugin;
