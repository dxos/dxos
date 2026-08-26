//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: [
    'org.dxos.plugin.statusBar.role.footer',
    'org.dxos.plugin.statusBar.role.statusBar',
    'org.dxos.plugin.statusBar.role.versionInfo',
  ],
});
export const Translations = AppCapability.translations(translations);
