//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.canvas',
    name: 'Canvas',
    author: 'DXOS',
    description: trim`
      An infinite, zoomable canvas of typed nodes and links at multiple depths.
      Renders a drawing as a scene graph: zoom into a portal to open its child scene.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-canvas',
    icon: { key: 'ph--graph--regular', hue: 'teal' },
    tags: ['labs'],
  },
});
