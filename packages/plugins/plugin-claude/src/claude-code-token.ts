//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Query } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import { isManagedAccessToken } from '@dxos/protocols';

import { CLAUDE_CODE_TOKEN_SOURCE } from './constants.ts';

/**
 * The space's Claude subscription token, made by `claude setup-token`, when one is connected. A
 * server-custodied token holds a placeholder here, so it is passed over.
 */
export const claudeCodeToken: Effect.Effect<string | undefined, never, Database.Service> = Database.query(
  Query.type(AccessToken.AccessToken),
).run.pipe(
  Effect.map(
    (tokens) =>
      tokens.find(
        (accessToken) => accessToken.source === CLAUDE_CODE_TOKEN_SOURCE && !isManagedAccessToken(accessToken.token),
      )?.token,
  ),
  Effect.orElseSucceed(() => undefined),
);
