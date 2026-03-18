//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { useCallback, useEffect, useState } from 'react';

import { type Key, Obj } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { withAuthorization } from '@dxos/functions';
import { log } from '@dxos/log';
import { type OAuthFlowResult } from '@dxos/protocols';
import { useEdgeClient } from '@dxos/react-edge-client';
import { AccessToken } from '@dxos/types';
import { isTauri } from '@dxos/util';

import { OAUTH_PRESETS, type OAuthPreset } from '../defs';
import {
  createTauriOAuthInitiator,
  createTauriServerProvider,
  isMobilePlatform,
  openTauriBrowser,
  performMobileOAuthFlow,
  performOAuthFlow,
} from '../oauth';

const GoogleUserInfo = Schema.Struct({
  email: Schema.optional(Schema.String),
});

/** Fetches the Google user's email and prepends it to the token's note. */
export const enrichGoogleTokenWithEmail = (token: AccessToken.AccessToken) =>
  Effect.gen(function* () {
    if (token.source !== 'google.com' || !token.token) {
      return;
    }

    const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token.token, 'Bearer')));

    // TODO(wittjosiah): Without this, executing the request results in CORS errors when traced.
    //  Is this an issue on Google's side or is it a bug in `@effect/platform`?
    //  https://github.com/Effect-TS/effect/issues/4568
    const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

    const userInfo = yield* HttpClientRequest.get('https://www.googleapis.com/oauth2/v3/userinfo').pipe(
      httpClientWithTracerDisabled.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(GoogleUserInfo)),
      Effect.scoped,
    );

    if (userInfo.email) {
      Obj.change(token, (t) => {
        t.note = `${userInfo.email} - ${t.note ?? ''}`.trim();
      });
    }
  }).pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.catchAll((error) => Effect.sync(() => log.warn('failed to fetch google user info', { error }))),
  );

export type UseOAuthOptions = {
  spaceId: Key.SpaceId;
  onAddAccessToken: (token: AccessToken.AccessToken) => void;
};

/**
 * Hook encapsulating the OAuth flow for creating access tokens.
 * Returns a function to initiate the OAuth flow for a given preset.
 */
export const useOAuth = ({ spaceId, onAddAccessToken }: UseOAuthOptions) => {
  const edgeClient = useEdgeClient();
  const [tokenMap] = useState(new Map<string, AccessToken.AccessToken>());

  useEffect(() => {
    if (isTauri()) {
      return;
    }

    const edgeOrigin = new URL(edgeClient.baseUrl).origin;
    const listener = (event: MessageEvent) =>
      runAndForwardErrors(
        Effect.gen(function* () {
          if (event.origin !== edgeOrigin) {
            return;
          }

          const data = event.data as OAuthFlowResult;
          if (!data.success) {
            log.warn('oauth flow failed', data);
            return;
          }

          const token = tokenMap.get(data.accessTokenId);
          if (!token) {
            log.warn('token object not found', data);
            return;
          }

          Obj.change(token, (t) => {
            t.token = data.accessToken;
          });
          yield* enrichGoogleTokenWithEmail(token);
          onAddAccessToken(token);
        }),
      ).catch(log.catch);

    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener);
    };
  }, [tokenMap, edgeClient.baseUrl, onAddAccessToken]);

  const startOAuthFlow = useCallback(
    async (preset: OAuthPreset) => {
      const token = Obj.make(AccessToken.AccessToken, {
        source: preset.source,
        note: preset.note,
        token: '',
      });

      tokenMap.set(token.id, token);

      if (isTauri()) {
        const oauthEffect = Effect.gen(function* () {
          const isMobile = yield* isMobilePlatform();
          if (isMobile) {
            yield* performMobileOAuthFlow({
              preset,
              accessToken: token,
              edgeClient,
              spaceId,
            });
          } else {
            yield* performOAuthFlow(
              preset,
              token,
              edgeClient,
              spaceId,
              createTauriServerProvider(),
              openTauriBrowser,
              createTauriOAuthInitiator(),
            );
          }
        });
        await runAndForwardErrors(
          oauthEffect.pipe(
            Effect.tap(() => enrichGoogleTokenWithEmail(token)),
            Effect.tap(() => onAddAccessToken(token)),
            Effect.catchAll((error) => Effect.sync(() => log.catch(error))),
          ),
        );
      } else {
        const { authUrl } = await edgeClient.initiateOAuthFlow({
          provider: preset.provider,
          scopes: preset.scopes,
          spaceId,
          accessTokenId: token.id,
        });

        log.info('open', { authUrl });
        window.open(authUrl, 'oauthPopup', 'width=500,height=600');
      }
    },
    [edgeClient, spaceId, tokenMap, onAddAccessToken],
  );

  return { startOAuthFlow };
};

/** Finds an OAuth preset by source identifier. */
export const getPresetBySource = (source: string): OAuthPreset | undefined =>
  OAUTH_PRESETS.find((p) => p.source === source);
