//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { type Chat } from '@dxos/assistant';
import { Database, Query } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import { log } from '@dxos/log';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import { isManagedAccessToken } from '@dxos/protocols';

import { ClaudeCapabilities } from '#types';

import * as ClaudeChoices from '../agents/ClaudeChoices.ts';
import * as EdgeAgent from '../agents/EdgeAgent.ts';
import { claudeCodeToken } from '../claude-code-token.ts';
import { ANTHROPIC_SOURCE, CLAUDE_CODE_AGENT, CLAUDE_CODE_EDGE_AGENT, OAUTH_TOKEN_PREFIX } from '../constants.ts';

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
    const agent = yield* EdgeAgent.make({
      id: CLAUDE_CODE_EDGE_AGENT,
      label: 'Claude Code',
      icon: 'px--anthropic--regular',
      credentials,
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

/**
 * The Claude credential the agent runs with, always a subscription OAuth token as `CLAUDE_CODE_OAUTH_TOKEN`:
 * the one from `claude setup-token` when connected, else an OAuth token stored as the space's Anthropic token.
 * An Anthropic API key is never lent, since a resident agent on a pay-per-token key can spend without bound.
 * A server-custodied token cannot be read here, so it is passed over.
 */
export const claudeCredentials = Effect.gen(function* () {
  const subscription = yield* claudeCodeToken;
  if (subscription !== undefined) {
    return subscription;
  }
  const tokens = yield* Database.query(Query.type(AccessToken.AccessToken)).run;
  const anthropic = tokens
    .filter((accessToken) => accessToken.source === ANTHROPIC_SOURCE && !isManagedAccessToken(accessToken.token))
    .map((accessToken) => accessToken.token);
  const token = anthropic.find((value) => value.startsWith(OAUTH_TOKEN_PREFIX));
  if (token === undefined) {
    log.warn(
      anthropic.length > 0
        ? 'no Claude subscription token is connected among the Anthropic tokens'
        : 'no Claude credential to lend the agent',
    );
  }
  return token;
}).pipe(
  Effect.map((token): Record<string, string> => (token === undefined ? {} : { CLAUDE_CODE_OAUTH_TOKEN: token })),
  Effect.orElseSucceed((): Record<string, string> => ({})),
);

/** Everything a turn lends the agent: its Claude credential, and the space's GitHub token for its repositories. */
export const credentials = Effect.all([claudeCredentials, EdgeAgent.githubCredentials]).pipe(
  Effect.map(([claude, github]): Record<string, string> => ({ ...github, ...claude })),
);
