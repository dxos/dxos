//
// Copyright 2023 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AnchoredTo } from '@dxos/types';

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
import { Meeting, MeetingEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const MeetingPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({ schema: [Meeting.Meeting, AnchoredTo.AnchoredTo] }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: Capability.getModuleTag(MeetingSettings),
    requires: MeetingSettings.requires,
    provides: MeetingSettings.provides,
    // Migration bridge for unmigrated SettingsReady listeners.
    compatFires: [MeetingEvents.SettingsReady],
    activate: MeetingSettings,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(MeetingState),
    requires: MeetingState.requires,
    provides: MeetingState.provides,
    // Migration bridge for unmigrated StateReady listeners.
    compatFires: [MeetingEvents.StateReady],
    activate: MeetingState,
  }),
  Plugin.addLazyModule(CallExtension),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default MeetingPlugin;
