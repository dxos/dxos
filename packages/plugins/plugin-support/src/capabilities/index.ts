//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import type * as TourModule from '@dxos/app-toolkit/Tour';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { HelpCapabilities, SupportCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  requires: [SupportCapabilities.Settings],
});
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'));
export const HelpState = Capability.lazyModule(
  'HelpState',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.Settings, HelpCapabilities.SeenTours, HelpCapabilities.State],
  },
  () => import('./help-state.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'));
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root.tsx'));
export const Tour = Capability.lazyModule(
  'Tour',
  {
    provides: [AppCapabilities.Tour],
    environments: [],
    props: (options: { helpSteps?: () => Promise<TourModule.Step[]> }) => options.helpSteps,
  },
  () => import('./tour.ts'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: [
    'org.dxos.plugin.space.role.homeContent',
    'org.dxos.plugin.support.role.hints',
    'org.dxos.plugin.support.role.keyshortcuts',
    'org.dxos.role.article',
    'org.dxos.role.deckCompanion.discord',
    'org.dxos.role.deckCompanion.help',
    'org.dxos.role.dialog',
    'org.dxos.role.section',
    'org.dxos.role.statusIndicator',
  ],
});
export const SupportSettings = AppCapability.settings(() => import('./settings.ts'), {
  provides: [SupportCapabilities.Settings],
});
export const TourAutoStart = Capability.lazyModule(
  'TourAutoStart',
  {
    requires: [
      AppCapabilities.AppGraph,
      AttentionCapabilities.Attention,
      Capabilities.AtomRegistry,
      Capabilities.OperationInvoker,
      ClientCapabilities.Client,
      HelpCapabilities.SeenTours,
      HelpCapabilities.State,
    ],
    provides: [],
  },
  () => import('./tour-auto-start.ts'),
);
export const Translations = AppCapability.translations(translations);
