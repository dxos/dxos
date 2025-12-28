//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/files',
  name: 'Files',
  description: trim`
    Bridge between your local file system and workspace, allowing you to open and edit files directly.
    Sync changes bidirectionally while maintaining files in their original locations.
  `,
  icon: 'ph--file--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-files',
  tags: ['labs'],
};
