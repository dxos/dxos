//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.blogger',
    name: 'Blogger',
    author: 'DXOS',
    description: 'Author blog posts with agent assistance.',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-blogger',
    icon: { key: 'ph--pen-nib--regular', hue: 'amber' },
  },
});
