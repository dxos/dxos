//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.integration',
  name: 'Integrations',
  description: trim`
    Manage integrations with external services.
    Connect your space to external services and manage your integrations here.
  `,
};
