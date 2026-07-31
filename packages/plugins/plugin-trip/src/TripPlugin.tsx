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
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Trip.Trip, Segment.Segment, Booking.Booking])),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Settings),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.addModule(
    Capability.inlineModule('trip-extractor', { provides: [InboxCapabilities.ObjectExtractor] }, () =>
      Effect.succeed([Capability.contribute(InboxCapabilities.ObjectExtractor, TripMessageExtractor)]),
    ),
  ),
  Plugin.addModule(MarkerProvider),
  Plugin.make,
);

export default TripPlugin;
