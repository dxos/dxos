//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.sequencer',
  name: 'Sequencer',
  author: 'DXOS',
  description: trim`
    Music sequencer / step-grid editor. A Score owns a set of tracks and per-track
    Sequence objects whose Notes are edited on a 2D piano-roll style grid (pitch
    on the y-axis, time on the x-axis).
  `,
  icon: 'ph--music-notes--regular',
  iconHue: 'fuchsia',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sequencer',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['labs'],
};
