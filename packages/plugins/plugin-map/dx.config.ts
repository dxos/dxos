//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.map',
    name: 'Maps',
    description: trim`
      Interactive geospatial mapping plugin that renders ECHO dataset records as map pins or globe markers.
      Connect any table schema that contains latitude/longitude coordinates to a named Map object,
      and the plugin automatically queries the linked dataset and projects each row as a geographic marker.

      The map viewport supports two rendering modes — a standard tile-based 2-D map and an interactive 3-D globe —
      switchable at any time via the toggle operation.
      Each mode preserves the current center and zoom level so context is not lost when switching views.

      Maps are collaborative ECHO objects: all peers sharing a space see viewport changes and dataset updates
      in real time without any manual refresh.
      A Blueprint is also included so AI assistants can create and update maps on behalf of the user.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-map',
    icon: { key: 'ph--compass--regular', hue: 'sky' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    screenshots: [{ dark: 'https://dxos.network/plugin-details-map-dark.png' }],
  },
});
