//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { SpacetimeCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.section'],
});
export const Schema = AppCapability.schema(() => import('./schema'));
export const SpacetimeSettings = AppCapability.settings(() => import('./settings'), {
  activatesOn: ActivationEvents.Idle,
  provides: [SpacetimeCapabilities.Settings],
});
export const Translations = AppCapability.translations(translations);
