//
// Copyright 2024 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});
export const Schema = AppCapability.schema([]);
export const Translations = AppCapability.translations(translations);
