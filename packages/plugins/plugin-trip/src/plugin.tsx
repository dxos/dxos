//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import {
  AppGraphBuilder,
  CreateObject,
  MarkerProvider,
  OperationHandler,
  ReactSurface,
  Schema,
  Settings,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { TripMessageExtractor } from '#operations';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const TripPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Schema),
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
