//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, AppPlugin } from '@dxos/app-toolkit';
import { InboxCapabilities } from '@dxos/plugin-inbox';

import {
  AppGraphBuilder,
  CreateObject,
  MarkerProvider,
  OperationHandler,
  ReactSurface,
  Settings,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { TripMessageExtractor } from '#operations';
import { translations } from '#translations';
import { Booking, Segment, Trip } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TripPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule<void, typeof AppGraphBuilder.requires>({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addSkillDefinitionModule<void>({
    requires: [],
    provides: [AppCapabilities.SkillDefinition],
    activate: SkillDefinition,
  }),
  AppPlugin.addCreateObjectModule<void>({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addOperationHandlerModule<void>({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule<void>({ schema: [Trip.Trip, Segment.Segment, Booking.Booking] }),
  AppPlugin.addSurfaceModule<void>({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addSettingsModule<void, typeof Settings.requires>({
    requires: Settings.requires,
    provides: Settings.provides,
    activate: Settings,
  }),
  AppPlugin.addTranslationsModule<void>({ translations }),
  AppPlugin.addPluginAssetModule<void>({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.addModule({
    id: 'trip-extractor',
    requires: [],
    provides: [InboxCapabilities.ObjectExtractor],
    activate: () => Effect.succeed([Capability.provide(InboxCapabilities.ObjectExtractor, TripMessageExtractor)]),
  }),
  Plugin.addLazyModule(MarkerProvider),
  Plugin.make,
);

export default TripPlugin;
