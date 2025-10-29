//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/meeting',
  name: 'Meetings',
  description: trim`
    Comprehensive meeting management tool that captures notes, generates real-time transcriptions, and creates AI-powered summaries.
    Automatically organize meeting records with timestamps and action items.
  `,
  icon: 'ph--note--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-meeting',
  tags: ['labs'],
  // TODO(wittjosiah): Needs new screenshots.
  screenshots: ['https://dxos.network/plugin-details-calls-dark.png'],
};
