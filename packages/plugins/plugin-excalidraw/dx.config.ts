//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.excalidraw',
    name: 'Excalidraw',
    author: 'DXOS',
    description: trim`
      Professional diagramming powered by Excalidraw for creating hand-drawn style illustrations.
      Build flowcharts, wireframes, and technical diagrams with a rich set of shapes and styling options.

      Each Excalidraw object owns a Canvas whose elements are stored as a plain JSON record in ECHO,
      so edits replicate peer-to-peer in real time and merge automatically when collaborators
      reconnect, using ECHO's CRDT semantics.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-excalidraw',
    icon: { key: 'ph--compass-tool--regular', hue: 'indigo' },
    tags: ['labs'],
    screenshots: [{ dark: 'https://dxos.network/plugin-details-excalidraw-dark.png' }],
  },
});
