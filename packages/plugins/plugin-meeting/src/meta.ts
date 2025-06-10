//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const MEETING_PLUGIN = 'dxos.org/plugin/meeting';

export const meta: PluginMeta = {
  id: MEETING_PLUGIN,
  name: 'Meetings',
  description:
    'The Meetings plugin supports realtime voice and video calls inside of Composer. Leveraging Cloudflare Calls infrastructure you can privately create peer-to-peer video channels that allow you to collaborate in realtime inside of Composer. The Meeting plugin also integrates with the Transcription plugin to provide realtime transcriptions and feed your meeting discussion to your LLM to provide nuanced context for automated workflows.',
  icon: 'ph--video-conference--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-meeting',
  tags: ['labs'],
  screenshots: ['https://dxos.network/plugin-details-calls-dark.png'],
};
