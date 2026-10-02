//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.interlocutor',
    name: 'Interlocutor',
    author: 'DXOS',
    description: trim`
      Autonomous agents that converse with people from Discord threads and Composer chats.
      Bind an agent to a Discord bot and each thread becomes a chat the agent replies in.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-interlocutor',
    icon: { key: 'ph--chats-circle--regular', hue: 'violet' },
    tags: ['labs', 'assistant'],
    dependsOn: ['org.dxos.plugin.assistant'],
  },
});
