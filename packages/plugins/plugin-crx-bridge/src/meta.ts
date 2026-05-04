//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.crxBridge',
  name: 'CRX Bridge',
  description: trim`
    Receives clippings from the Composer browser extension and materializes them
    as Person or Organization objects in the active space.
  `,
  icon: 'ph--paperclip--regular',
  iconHue: 'neutral',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-crx-bridge',
};
