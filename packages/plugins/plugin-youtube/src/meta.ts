//
// Copyright 2024 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/youtube',
  name: 'YouTube',
  description: trim`
    YouTube channel subscription and video feed management.
    Sync videos from channels and access transcripts for analysis.
  `,
  icon: 'ph--youtube-logo--regular',
  iconHue: 'red',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-youtube',
  tags: ['labs'],
};
