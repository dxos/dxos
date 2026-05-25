//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { meta as fileMeta } from '@dxos/plugin-file';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.wnfs',
  name: 'WNFS',
  author: 'DXOS',
  description: trim`
    Decentralized file storage using the Web Native File System protocol.
    Store and sync files with end-to-end encryption across devices without central servers.
  `,
  icon: 'ph--file-cloud--regular',
  iconHue: 'teal',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-wnfs',
  tags: ['labs'],
  dependsOn: [fileMeta.id],
};
