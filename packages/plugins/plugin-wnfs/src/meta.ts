//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/wnfs',
  name: 'WNFS',
  description: trim`
    Decentralized file storage using the Web Native File System protocol.
    Store and sync files with end-to-end encryption across devices without central servers.
  `,
  icon: 'ph--file-cloud--regular',
  iconHue: 'teal',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-wnfs',
};
