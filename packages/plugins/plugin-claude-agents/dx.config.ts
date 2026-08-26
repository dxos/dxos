//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.claudeAgents',
    name: 'Claude Agents',
    author: 'DXOS',
    description: trim`
      Model Anthropic Claude managed agents as first-class objects in your space. A ClaudeManagedAgent
      holds the agent's configuration — model, system prompt, toolsets, skills and MCP servers — and,
      once deployed, the identifier of the agent Anthropic hosts on your behalf.

      Sessions started against an agent are recorded alongside it, so the assistant can deploy an
      agent, start a session, send it work and read back the transcript without leaving the space.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-claude-agents',
    icon: { key: 'ph--robot--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
