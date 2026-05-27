//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.pwa'),
  name: 'PWA',
  author: 'DXOS',
  description: trim`
    Progressive Web App capabilities enabling offline functionality and app-like experience.
    Install to home screen and use the workspace without internet connection.
  `,
  tags: ['system'],
};
