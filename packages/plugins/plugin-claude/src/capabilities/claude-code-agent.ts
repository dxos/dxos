//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as CodeAgent from '@dxos/plugin-code/CodeAgent';

import { CLAUDE_CODE_AGENT } from '../constants.ts';
import { ClaudeCodeProcess } from '../process/index.ts';

/**
 * Claude Code on this machine: run through the desktop app's agent helper over ACP as a chat's agent,
 * and as a process of its own for a chat that names it, which starts the agent through `Subprocess`.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { agent, options } = yield* CodeAgent.make({
      id: CLAUDE_CODE_AGENT,
      label: 'Claude Code',
      icon: 'px--anthropic--regular',
      // Read by the ACP adapter as Agent SDK options: Composer's lookups run without a permission card each.
      sessionMeta: ({ server, readOnlyTools }) => ({
        claudeCode: { options: { allowedTools: readOnlyTools.map((tool) => `mcp__${server}__${tool}`) } },
      }),
    });
    return [
      Capability.contribute(AssistantCapabilities.Agent, agent),
      Capability.contribute(AssistantCapabilities.AgentProcess, ClaudeCodeProcess.make(options)),
    ];
  }),
);
