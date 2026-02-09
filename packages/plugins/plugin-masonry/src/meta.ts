//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/masonry',
  name: 'Masonry',
  description: trim`
    Responsive grid layout that displays query results in an adaptive masonry pattern.
    Visualize collections of cards, images, or mixed content that automatically adjusts to available screen space.
  `,
  icon: 'ph--wall--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-masonry',
  screenshots: [],
};
