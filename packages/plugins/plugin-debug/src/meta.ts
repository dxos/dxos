//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/debug',
  name: 'Debug',
  description: trim`
    Comprehensive developer toolkit for troubleshooting applications, generating test data, and exploring automation capabilities.
    Inspect objects, monitor events, and debug plugin behavior in real-time.
  `,
  icon: 'ph--bug--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-debug',
  screenshots: ['https://dxos.network/plugin-details-debug-dark.png'],
};
