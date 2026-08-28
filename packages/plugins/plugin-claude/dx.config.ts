//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.claude',
    name: 'Claude',
    author: 'DXOS',
    description: trim`
      Run Anthropic Claude agents from your space. An agent's configuration — model, system prompt,
      toolsets, skills and MCP servers — is an object you edit locally and deploy to Anthropic, which
      hosts and runs it on your behalf.

      Sessions started against an agent are recorded alongside it, so the assistant can deploy an
      agent, start a session, send it work and read back the transcript without leaving the space.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-claude',
    icon: { key: 'px--anthropic--regular', hue: 'yellow' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.assistant'],
  },
});
