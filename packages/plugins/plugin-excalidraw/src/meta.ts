//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/excalidraw',
  name: 'Excalidraw',
  description: trim`
    Professional diagramming powered by Excalidraw for creating hand-drawn style illustrations.
    Build flowcharts, wireframes, and technical diagrams with a rich set of shapes and styling options.
  `,
  icon: 'ph--compass-tool--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-excalidraw',
  tags: ['labs'],
  screenshots: ['https://dxos.network/plugin-details-excalidraw-dark.png'],
};
