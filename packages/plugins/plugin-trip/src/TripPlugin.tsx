//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
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
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Trip.Trip, Segment.Segment, Booking.Booking])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(Settings),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({ pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' }),
  ),
  Plugin.addLazyModule(
    Capability.inlineModule(
      'trip-extractor',
      { provides: [InboxCapabilities.ObjectExtractor] },
      () => Effect.succeed([Capability.provide(InboxCapabilities.ObjectExtractor, TripMessageExtractor)]),
    ),
  ),
  Plugin.addLazyModule(MarkerProvider),
  Plugin.make,
);

export default TripPlugin;
