//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.preview',
    name: 'Preview',
    author: 'DXOS',
    description: trim`
      Rich preview panel for viewing object content without opening full editors.
      Quick peek at documents, images, and data with inline rendering.
    `,
    icon: { key: 'ph--eye--regular' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-preview',
    tags: ['system'],
  },
});
