//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const CALLS_PLUGIN = 'dxos.org/plugin/calls';

export const meta = {
  id: CALLS_PLUGIN,
  name: 'Calls',
  description: `The Calls plugin allows you to have realtime voice and video calls inside of Composer. Leveraging Cloudflare Calls infrastructure you can privately create peer-to-peer video channels that allow you to collaborate in realtime inside of Composer. The Call plugin also allows you to trigger realtime transcriptions and feed your meeting discussion to your LLM to provide nuanced context for automated workflows. `,
  icon: 'ph--phone-call--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-calls',
  tags: ['experimental'],
  screenshots: ['https://dxos.network/plugin-details-calls-dark.png'],
} satisfies PluginMeta;
