//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { type Chat } from '@dxos/assistant';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';

import { ClaudeCapabilities } from '#types';

import * as ClaudeChoices from '../agents/ClaudeChoices.ts';
import * as EdgeAgentClient from '../agents/EdgeAgentClient.ts';
import * as EdgeCredentials from '../agents/EdgeCredentials.ts';
import { CLAUDE_CODE_AGENT, CLAUDE_CODE_EDGE_AGENT } from '../constants.ts';

/**
 * Claude Code run by EDGE in a sandbox container. Each turn lends it the space's Claude subscription
 * token and the space's GitHub token for the project's repositories, as the environment the agent runs with.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.Service;
    // A chat's own choice, else the plugin's permission setting, which governs both coding agents; a chat keeps
    // the mode it was spawned with.
    const mode = (chat: Chat.Chat): string => {
      const [settings] = manager.getAll(ClaudeCapabilities.Settings);
      const [registry] = manager.getAll(Capabilities.AtomRegistry);
      return ClaudeChoices.permissionMode(chat.session, settings && registry ? registry.get(settings) : undefined);
    };
    const agent = yield* EdgeAgentClient.make({
      id: CLAUDE_CODE_EDGE_AGENT,
      label: 'Claude Code',
      icon: 'px--anthropic--regular',
      credentials: EdgeCredentials.credentials,
      mode,
      // Read by the ACP adapter in the sandbox as Agent SDK options.
      sessionMeta: (chat) => {
        const options = ClaudeChoices.sdkOptions(chat.session);
        return Object.keys(options).length > 0 ? { claudeCode: { options } } : undefined;
      },
    });
    return Capability.contribute(AssistantCapabilities.Agent, {
      ...agent,
      locations: ['edge'],
      variantOf: CLAUDE_CODE_AGENT,
      ownModel: true,
      // Also offered here, since a web app registers no local Claude Code to offer them.
      choices: ClaudeChoices.CHOICES,
    });
  }),
);
