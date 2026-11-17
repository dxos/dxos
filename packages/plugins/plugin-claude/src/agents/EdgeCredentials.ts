//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { Database, Query } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import { log } from '@dxos/log';
import { isManagedAccessToken } from '@dxos/protocols';

import { claudeCodeToken } from '../claude-code-token.ts';
import { ANTHROPIC_SOURCE, OAUTH_TOKEN_PREFIX } from '../constants.ts';
import * as EdgeAgent from './EdgeAgent.ts';

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

/**
 * Service tokens the agent may hold beside its Claude and GitHub credentials, by the source a space stores them under,
 * and the variable the agent's tools read: a repository's own checks need them to land a pull request (the agentic
 * review). Named one by one, so storing a token in the space never lends it on its own.
 */
export const SERVICE_TOKENS: Readonly<Record<string, string>> = {
  'typesafe.ai': 'TYPESAFE_API_KEY',
};

/** The space's tokens for {@link SERVICE_TOKENS}, as the variables they are read from; a managed token is passed over. */
export const serviceCredentials = Effect.gen(function* () {
  const tokens = yield* Database.query(Query.type(AccessToken.AccessToken)).run;
  return Object.fromEntries(
    tokens.flatMap((accessToken) => {
      const variable = SERVICE_TOKENS[accessToken.source];
      return variable === undefined || isManagedAccessToken(accessToken.token) ? [] : [[variable, accessToken.token]];
    }),
  );
}).pipe(Effect.orElseSucceed((): Record<string, string> => ({})));

/**
 * Everything a turn lends the agent: its Claude credential, the space's GitHub token for its repositories, and the
 * service tokens its repositories' checks need.
 */
export const credentials = Effect.all([claudeCredentials, EdgeAgent.githubCredentials, serviceCredentials]).pipe(
  Effect.map(([claude, github, services]): Record<string, string> => ({ ...services, ...github, ...claude })),
);
