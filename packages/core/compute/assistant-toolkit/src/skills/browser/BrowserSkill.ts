//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

export const key = 'org.dxos.skill.browser';

const instructions = trim`
  You are able to connect and use a virtual browser with persistent session.
  Browser tools come from the built-in Browser MCP server (\`org.dxos.mcp.browser\`), not from this
  skill, and it is off until turned on. When you need them, turn it on with the Skill Manager's
  set-mcp-connection; they are available from your next step.
`;

export const make = () =>
  Skill.make({
    key,
    name: 'Browser',
    description: 'Access to a real isolated browser.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
  });
