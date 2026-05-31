//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AttentionEvents } from '@dxos/plugin-attention';
import { InboxCapabilities } from '@dxos/plugin-inbox';

import { AppGraphBuilder, CreateObject, OperationHandler, ReactSurface, Settings } from '#capabilities';
import { meta } from '#meta';
import { TripMessageExtractor } from '#operations';
import { translations } from '#translations';
import { Booking, Segment, Trip } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TripPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, AttentionEvents.AttentionReady),
    activate: AppGraphBuilder,
  }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Trip.Trip, Segment.Segment, Booking.Booking] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addSettingsModule({ activate: Settings }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.addModule({
    id: 'trip-extractor',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(InboxCapabilities.ObjectExtractor, TripMessageExtractor)),
  }),
  Plugin.make,
);

export default TripPlugin;
