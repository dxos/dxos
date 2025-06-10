//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const MEETING_PLUGIN = 'dxos.org/plugin/meeting';

export const meta: PluginMeta = {
  id: MEETING_PLUGIN,
  name: 'Meetings',
  description:
    'The Meeting plugin integrates with the chat plugin to provide meetings notes, transcripts and summaries of calls. It depends on the Transcription plugin to provide realtime transcriptions and feed your meeting discussion to your LLM to provide nuanced context for automated workflows.',
  icon: 'ph--note--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-meeting',
  tags: ['labs'],
  // TODO(wittjosiah): Needs new screenshots.
  screenshots: ['https://dxos.network/plugin-details-calls-dark.png'],
};
