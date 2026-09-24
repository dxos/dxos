//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import { meta } from '#meta';
import { TripMessageExtractor } from '#operations';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';
import skillDefinition from './skill-definition.ts';

export { TripAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export { Schema } from './schema.ts';
export const SkillDefinition = Capability.makeModule(
  'SkillDefinition',
  { provides: [AppCapabilities.SkillDefinition] },
  skillDefinition,
);
export { CreateObject } from './create-object.ts';
export { MarkerProvider } from './marker-provider.tsx';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { TripSettings as Settings } from './settings.ts';
export const Translations = AppCapability.translations(translations);
export const TripExtractor = Capability.makeModule(
  'trip-extractor',
  { provides: [InboxCapabilities.ObjectExtractor] },
  () => Effect.succeed([Capability.contribute(InboxCapabilities.ObjectExtractor, TripMessageExtractor)]),
);
