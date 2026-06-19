//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { OAUTH_TIMEOUT_MS, openBrowser, startOAuthCallbackServer } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { Database } from '@dxos/echo';
import { createEdgeClient } from '@dxos/functions-runtime/edge';
import { type OAuthFlowResult } from '@dxos/protocols';
import { type AccessToken } from '@dxos/types';

import {
  type OAuthServerProvider,
  createFetchOAuthInitiator,
  performOAuthFlow as performOAuthFlowShared,
} from '../../oauth';
import { type OAuthPreset } from './util';

/**
 * Bun-based OAuth callback server provider for CLI usage. Wraps the shared callback server in
 * `@dxos/cli-util/oauth` (listening on Edge's `/redirect/oauth`), adapting its captured query
 * params to the integration-connect `OAuthFlowResult`.
 */
const createBunServerProvider = (): OAuthServerProvider => ({
  start: () =>
    startOAuthCallbackServer('/redirect/oauth').pipe(
      Effect.map((server) => ({
        port: server.port,
        stop: server.stop,
        // The shared server resolves on any callback; the integration flow ignores the access
        // token id and maps the captured `accessTokenId` / `accessToken` params to the result.
        waitForResult: (_accessTokenId: string, timeoutMs: number = OAUTH_TIMEOUT_MS) =>
          server.waitForResult(timeoutMs).pipe(
            Effect.map(
              (params): OAuthFlowResult => ({
                success: true,
                accessTokenId: params.accessTokenId,
                accessToken: params.accessToken,
              }),
            ),
          ),
      })),
    ),
});

/**
 * Performs OAuth flow for a preset using the shared Bun HTTP callback server.
 */
export const performOAuthFlow = Effect.fn(function* (preset: OAuthPreset, accessToken: AccessToken.AccessToken) {
  const client = yield* ClientService;
  const edgeClient = createEdgeClient(client);
  const spaceId = yield* Database.spaceId;

  yield* performOAuthFlowShared(
    preset,
    accessToken,
    edgeClient,
    spaceId,
    createBunServerProvider(),
    openBrowser,
    createFetchOAuthInitiator(),
  );
});
