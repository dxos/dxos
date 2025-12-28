//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/pwa',
  name: 'PWA',
  description: trim`
    Progressive Web App capabilities enabling offline functionality and app-like experience.
    Install to home screen and use the workspace without internet connection.
  `,
};
