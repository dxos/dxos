//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as MapCapabilities from '@dxos/plugin-map/MapCapabilities';
import * as MapEvents from '@dxos/plugin-map/MapEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { TripMessageExtractor } from '#operations';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';
import skillDefinition from './skill-definition.ts';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  requires: [AttentionCapabilities.ViewState],
});
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = Capability.inlineModule(
  'SkillDefinition',
  { provides: [AppCapabilities.SkillDefinition] },
  skillDefinition,
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'));
// Browser-only: a `MarkerProvider` contributes a `useMarkers` React hook, and this one calls
// `useMemo`/`useObject`/`useObjects` in its own body.
export const MarkerProvider = Capability.lazyModule(
  'MarkerProvider',
  { provides: [MapCapabilities.MarkerProvider], activatesOn: MapEvents.Start, environments: [] },
  () => import('./marker-provider.tsx'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.section'],
});
export const Settings = AppCapability.settings(() => import('./settings.ts'), {
  activatesOn: ActivationEvents.Idle,
  requires: [Capabilities.AtomRegistry],
});
export const Translations = AppCapability.translations(translations);
export const TripExtractor = Capability.inlineModule(
  'trip-extractor',
  { provides: [InboxCapabilities.ObjectExtractor] },
  () => Effect.succeed([Capability.contribute(InboxCapabilities.ObjectExtractor, TripMessageExtractor)]),
);
