//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.zen',
  name: 'Zen',
  description: trim`
    Ambient sound and meditation plugin. Configure soundscapes with
    layered samples and binaural beat generators.
  `,
  icon: 'ph--moon-stars--regular',
  iconHue: 'violet',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-zen',
};
