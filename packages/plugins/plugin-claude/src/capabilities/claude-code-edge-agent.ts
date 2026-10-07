//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Database, Query } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as CodeCapabilities from '@dxos/plugin-code/CodeCapabilities';
import * as EdgeAgent from '@dxos/plugin-code/EdgeAgent';
import { isManagedAccessToken } from '@dxos/protocols';

import { claudeCodeToken } from '../claude-code-token.ts';
import { ANTHROPIC_SOURCE, CLAUDE_CODE_EDGE_AGENT, OAUTH_TOKEN_PREFIX } from '../constants.ts';

/**
 * Claude Code run by EDGE in a sandbox container. It lends each turn the space's Claude subscription
 * token, or its Anthropic token, and the space's GitHub token for the project's repositories: the
 * container holds only a token for EDGE's proxy, so the user's credentials never enter it.
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
        credential: anthropicCredential,
        gitCredential: EdgeAgent.githubCredential,
        mode,
      }),
    );
  }),
);

/**
 * The credential each turn lends: the Claude subscription token from `claude setup-token` when one is
 * connected, else the space's Anthropic token. A server-custodied token cannot be read here, so it is
 * passed over.
 */
export const anthropicCredential = Effect.gen(function* () {
  const subscription = yield* claudeCodeToken;
  if (subscription !== undefined) {
    return { kind: 'oauth' as const, value: subscription };
  }
  const tokens = yield* Database.query(Query.type(AccessToken.AccessToken)).run;
  const token = tokens.find(
    (accessToken) => accessToken.source === ANTHROPIC_SOURCE && !isManagedAccessToken(accessToken.token),
  )?.token;
  return token === undefined
    ? undefined
    : { kind: token.startsWith(OAUTH_TOKEN_PREFIX) ? ('oauth' as const) : ('api-key' as const), value: token };
}).pipe(Effect.orElseSucceed(() => undefined));
