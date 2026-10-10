//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Database, Query } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import { log } from '@dxos/log';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as CodeCapabilities from '@dxos/plugin-code/CodeCapabilities';
import * as EdgeAgent from '@dxos/plugin-code/EdgeAgent';
import { isManagedAccessToken } from '@dxos/protocols';

import { claudeCodeToken } from '../claude-code-token.ts';
import { ANTHROPIC_SOURCE, CLAUDE_CODE_EDGE_AGENT, OAUTH_TOKEN_PREFIX } from '../constants.ts';

/**
 * Claude Code run by EDGE in a sandbox container. Each turn lends it the space's Claude subscription
 * token, or its Anthropic token, and the space's GitHub token for the project's repositories, as the
 * environment the agent runs with.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.Service;
    // The Code plugin's permission setting governs both coding agents; a chat keeps the mode it was spawned with.
    const mode = (): string | undefined => {
      const [settings] = manager.getAll(CodeCapabilities.Settings);
      const [registry] = manager.getAll(Capabilities.AtomRegistry);
      return settings && registry ? registry.get(settings).agentPermissionMode : undefined;
    };
    return Capability.contribute(
      AssistantCapabilities.Agent,
      yield* EdgeAgent.make({
        id: CLAUDE_CODE_EDGE_AGENT,
        label: 'Claude Code (cloud)',
        icon: 'px--anthropic--regular',
        credentials,
        mode,
      }),
    );
  }),
);

/**
 * The Claude credential the agent runs with: the subscription token from `claude setup-token` as
 * `CLAUDE_CODE_OAUTH_TOKEN` when one is connected, else the space's Anthropic token, as whichever variable
 * its kind needs. A server-custodied token cannot be read here, so it is passed over.
 */
export const claudeCredentials = Effect.gen(function* () {
  const env: Record<string, string> = {};
  const subscription = yield* claudeCodeToken;
  if (subscription !== undefined) {
    env.CLAUDE_CODE_OAUTH_TOKEN = subscription;
    return env;
  }
  const tokens = yield* Database.query(Query.type(AccessToken.AccessToken)).run;
  const token = tokens.find(
    (accessToken) => accessToken.source === ANTHROPIC_SOURCE && !isManagedAccessToken(accessToken.token),
  )?.token;
  if (token === undefined) {
    log.warn('no Claude credential to lend the agent');
  } else {
    env[token.startsWith(OAUTH_TOKEN_PREFIX) ? 'CLAUDE_CODE_OAUTH_TOKEN' : 'ANTHROPIC_API_KEY'] = token;
  }
  return env;
}).pipe(Effect.orElseSucceed((): Record<string, string> => ({})));

/** Everything a turn lends the agent: its Claude credential, and the space's GitHub token for its repositories. */
export const credentials = Effect.all([claudeCredentials, EdgeAgent.githubCredentials]).pipe(
  Effect.map(([claude, github]): Record<string, string> => ({ ...github, ...claude })),
);
