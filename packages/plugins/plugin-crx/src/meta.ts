//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.crx',
  name: 'CRX',
  description: trim`
    Manages how Composer coordinates with the composer-crx browser extension.
    Owns the user-facing settings surface for the extension integration.
  `,
  icon: 'ph--browser--regular',
  iconHue: 'neutral',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-crx',
};
