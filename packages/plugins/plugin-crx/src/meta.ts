//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.crx',
  name: 'CRX',
  author: 'DXOS',
  description: trim`
    Coordinates with the composer-crx browser extension. Owns the settings
    surface and receives clippings from the extension, materializing them as
    Person, Organization, or Note objects in the active space.
  `,
  icon: 'ph--browser--regular',
  iconHue: 'neutral',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-crx',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['system'],
};
