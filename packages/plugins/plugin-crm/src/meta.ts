//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.crm',
  name: 'CRM',
  description: trim`
    Contribute a CRM blueprint for researching people and organizations and
    producing structured Profile documents in your space.
  `,
  icon: 'ph--address-book--regular',
  iconHue: 'emerald',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-crm',
  tags: ['labs'],
};
