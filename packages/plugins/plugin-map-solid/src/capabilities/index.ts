//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';

export const Surface = AppCapability.surface(() => import('./surface.tsx'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.section'],
});
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});
