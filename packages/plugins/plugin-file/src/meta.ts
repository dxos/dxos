//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.file',
  name: 'File',
  author: 'DXOS',
  description: 'Store images, videos, and PDFs (up to 4MB) directly inside an ECHO document.',
  icon: 'ph--file--regular',
  iconHue: 'teal',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-file',
};
