//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

const BLUEPRINT_KEY = 'org.dxos.blueprint.browser';

const instructions = trim`
  You are able to connect and use a virtual browser with persistent session.
  Browser tools are provided via MCP.
`;

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Browser',
    description: 'Access to a real isolated browser.',
    instructions: {
      source: Ref.make(Text.make(instructions)),
    },
    mcpServers: [
      {
        // https://dash.cloudflare.com/950816f3f59b079880a1ae33fb0ec320/workers/services/view/playwright-mcp-example/production
        url: 'https://playwright-mcp-example.dxos.workers.dev/sse',
        protocol: 'sse',
      },
    ],
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
  functions: [],
};

export default blueprint;
