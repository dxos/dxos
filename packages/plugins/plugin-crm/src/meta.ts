//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.crm',
  name: 'CRM',
  author: 'DXOS',
  description: trim`
    Contribute a CRM blueprint for researching people and organizations and
    producing structured Profile documents in your space.
  `,
  icon: 'ph--address-book--regular',
  iconHue: 'emerald',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-crm',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['labs'],
};
