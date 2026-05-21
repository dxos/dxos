//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.calls',
  name: 'Calls',
  author: 'DXOS',
  description: trim`
    Video and audio conferencing. Attach a call to any object via its DXN —
    persistent meeting records, transcripts and summaries are owned by plugin-meeting.
  `,
  icon: 'ph--video-conference--regular',
  iconHue: 'cyan',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-calls',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['labs'],
};
