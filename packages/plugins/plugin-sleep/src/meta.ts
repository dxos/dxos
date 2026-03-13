//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/sleep',
  name: 'Sleep',
  description: trim`
    Sleep aid plugin inspired by Pzizz. Configure dream soundscapes with
    selectable soundtracks and durations to help you fall asleep.
  `,
  icon: 'ph--moon-stars--regular',
  iconHue: 'violet',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sleep',
};
