//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import * as ClaudeChoices from '../agents/ClaudeChoices.ts';
import * as CodeAgent from '../agents/CodeAgent.ts';
import { CLAUDE_CODE_AGENT } from '../constants.ts';
import { ClaudeCodeProcess } from '../process/index.ts';

/**
 * Claude Code on this machine: run through the desktop app's agent helper over ACP as a chat's agent,
 * and as a process of its own for a chat that names it, which starts the agent through `ShellService`.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { agent, options } = yield* CodeAgent.make({
      id: CLAUDE_CODE_AGENT,
      label: 'Claude Code',
      icon: 'px--anthropic--regular',
      choices: ClaudeChoices.CHOICES,
      mode: (chat) => chat.session?.agentMode,
      // Read by the ACP adapter as Agent SDK options: Composer's lookups run without a permission card each.
      sessionMeta: ({ server, readOnlyTools, chat }) => ({
        claudeCode: {
          options: {
            allowedTools: readOnlyTools.map((tool) => `mcp__${server}__${tool}`),
            ...ClaudeChoices.sdkOptions(chat.session),
          },
        },
      }),
    });
    const manager = yield* Capability.Service;
    return [
      Capability.contribute(AssistantCapabilities.Agent, { ...agent, ownModel: true }),
      Capability.contribute(
        AssistantCapabilities.AgentProcess,
        ClaudeCodeProcess.make({
          ...options,
          mcpEndpoint: (connection) =>
            ConnectorSpec.mcpEndpoint(manager.getAll(ConnectorSpec.Connector).flat(), connection),
        }),
      ),
    ];
  }),
);
