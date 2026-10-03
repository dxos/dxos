//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Database, Query } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as EdgeAgent from '@dxos/plugin-code/EdgeAgent';
import { isManagedAccessToken } from '@dxos/protocols';

import { ANTHROPIC_SOURCE, CLAUDE_CODE_EDGE_AGENT } from '../constants.ts';

/** Prefix of a Claude subscription OAuth token, which the API takes as a bearer rather than as an API key. */
const OAUTH_TOKEN_PREFIX = 'sk-ant-oat';

/**
 * Claude Code run by EDGE in a sandbox container. It lends each turn the space's Anthropic token: the
 * container holds only a token for EDGE's proxy, so the user's credential never enters it.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(
      AssistantCapabilities.Agent,
      yield* EdgeAgent.make({
        id: CLAUDE_CODE_EDGE_AGENT,
        label: 'Claude Code (cloud)',
        icon: 'px--anthropic--regular',
        credential: anthropicCredential,
      }),
    );
  }),
);

/** The space's Anthropic token; a server-custodied one cannot be read here, so it is passed over. */
const anthropicCredential = Effect.gen(function* () {
  const tokens = yield* Database.query(Query.type(AccessToken.AccessToken)).run;
  const token = tokens.find(
    (accessToken) => accessToken.source === ANTHROPIC_SOURCE && !isManagedAccessToken(accessToken.token),
  )?.token;
  return token === undefined
    ? undefined
    : { kind: token.startsWith(OAUTH_TOKEN_PREFIX) ? ('oauth' as const) : ('api-key' as const), value: token };
}).pipe(Effect.orElseSucceed(() => undefined));
