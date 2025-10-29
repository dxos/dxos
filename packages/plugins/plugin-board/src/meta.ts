//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/board',
  name: 'Board',
  description: trim`
    Infinite canvas workspace that combines sticky notes, media, and whiteboarding tools.
    Arrange and connect ideas freely in a visual space perfect for brainstorming and creative collaboration.
  `,
  icon: 'ph--squares-four--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-board',
  screenshots: [],
};
