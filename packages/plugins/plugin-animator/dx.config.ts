//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.animator',
    name: 'Animator',
    author: 'DXOS',
    description: trim`
      Animate objects other plugins own: key their properties on a timeline, script shots declaratively, and play
      them as a film of shots.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-animator',
    icon: { key: 'ph--film-strip--regular', hue: 'violet' },
    tags: ['labs'],
  },
});
