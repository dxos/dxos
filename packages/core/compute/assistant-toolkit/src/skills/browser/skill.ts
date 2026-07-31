//
// Copyright 2025 DXOS.org
//

import { Skill } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

const SKILL_KEY = 'org.dxos.skill.browser';

const instructions = trim`
  You are able to connect and use a virtual browser with persistent session.
  Browser tools are provided via MCP.
`;

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Browser',
    description: 'Access to a real isolated browser.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    mcpServers: [
      {
        // https://dash.cloudflare.com/950816f3f59b079880a1ae33fb0ec320/workers/services/view/playwright-mcp-example/production
        url: 'https://playwright-mcp-example.dxos.workers.dev/sse',
        protocol: 'sse',
      },
    ],
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
