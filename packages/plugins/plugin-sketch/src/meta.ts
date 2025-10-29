//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/sketch',
  name: 'Sketch',
  description: trim`
    Lightweight digital whiteboard for quick sketches and visual thinking.
    Draw freehand, add shapes and annotations, and collaborate in real-time on simple diagrams.
  `,
  icon: 'ph--compass-tool--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sketch',
  screenshots: ['https://dxos.network/plugin-details-sketch-dark.png'],
};
