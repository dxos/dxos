//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.file',
  name: 'File',
  description: trim`
    Store images, videos, and PDFs (up to 4MB) directly inside an ECHO document.
    No external blob storage, no IPFS — bytes live on the object itself.
  `,
  icon: 'ph--file--regular',
  iconHue: 'teal',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-file',
  tags: ['system'],
};
