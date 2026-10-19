//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.agent',
    name: 'Agent',
    author: 'DXOS',
    description: trim`
      Autonomous agents that converse with people in channels and Composer chats. Give an agent
      channels — a Discord bot, a freeq room, a local feed — and each conversation in them becomes a
      chat the agent replies in.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-agent',
    icon: { key: 'ph--chats-circle--regular', hue: 'violet' },
    tags: ['labs', 'assistant'],
    dependsOn: ['org.dxos.plugin.assistant', 'org.dxos.plugin.thread'],
  },
});
