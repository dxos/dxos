//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/meeting',
  name: 'Meetings',
  description: 'Create meeting notes, transcripts, and summaries with real-time transcription.',
  icon: 'ph--note--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-meeting',
  tags: ['labs'],
  // TODO(wittjosiah): Needs new screenshots.
  screenshots: ['https://dxos.network/plugin-details-calls-dark.png'],
};
