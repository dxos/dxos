//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import * as AnimatorEvents from '@dxos/plugin-animator/AnimatorEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { SpacetimeCapabilities } from '#types';

// The scene as an animator stage, contributed when the animator starts; browser-only, as it renders with Babylon.
export const AnimatorStage = Capability.lazyModule(
  'animator-stage',
  {
    provides: [AnimatorCapabilities.Stage],
    activatesOn: AnimatorEvents.Start,
    environments: ['browser', 'tauri'],
  },
  () => import('./animator-stage.ts'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'));
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SpacetimeSettings = AppCapability.settings(() => import('./settings.ts'), {
  activatesOn: ActivationEvents.Idle,
  provides: [SpacetimeCapabilities.Settings],
});
export const Translations = AppCapability.translations(translations);
