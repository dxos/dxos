//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.pwa',
    name: 'PWA',
    description: trim`
      Progressive Web App capabilities enabling offline functionality and app-like experience.
      Install to home screen and use the workspace without internet connection.
    `,
    tags: ['system'],
  },
});
