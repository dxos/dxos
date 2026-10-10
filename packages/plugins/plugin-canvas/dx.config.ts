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
    dependsOn: ['org.dxos.plugin.illustrator'],
    icon: { key: 'ph--graph--regular', hue: 'teal' },
    screenshots: [
      { dark: 'https://assets.composer.space/demos/2026-10-09-plugin-canvas.mp4?v=5b3598bd' },
      { dark: 'https://assets.composer.space/demos/2026-10-10-plugin-canvas-uml.mp4?v=b7c7aa13' },
    ],
    tags: ['labs'],
  },
});
