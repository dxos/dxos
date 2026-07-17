//
// Copyright 2023 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import {
  AppGraphBuilder,
  CreateObject,
  MapSettings,
  MapState,
  MarkerProvider,
  OperationHandler,
  ReactSurface,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Map, MapEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const MapPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addSkillDefinitionModule({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({ schema: [Map.Map] }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addSettingsModule({
    requires: MapSettings.requires,
    provides: MapSettings.provides,
    // Migration bridge for unmigrated SettingsReady listeners.
    compatFires: [MapEvents.SettingsReady],
    activate: MapSettings,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: Capability.getModuleTag(MarkerProvider),
    requires: MarkerProvider.requires,
    provides: MarkerProvider.provides,
    activate: MarkerProvider,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(MapState),
    requires: MapState.requires,
    provides: MapState.provides,
    // Migration bridge for unmigrated StateReady listeners.
    compatFires: [MapEvents.StateReady],
    activate: MapState,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default MapPlugin;
