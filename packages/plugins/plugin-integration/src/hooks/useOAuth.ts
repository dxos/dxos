//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useEffect, useState } from 'react';

import { Context } from '@dxos/context';
import { type Key, Obj } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
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

          Obj.change(token, (token) => {
            token.token = data.accessToken;
          });
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
        // Default note to the service label so `Obj.getLabel(token)` has a meaningful
        // fallback before the provider's `onTokenCreated` fills in `account`.
        note: preset.note ?? preset.label,
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
            Effect.tap(() => onAddAccessToken(token)),
            Effect.catchAll((error) => Effect.sync(() => log.catch(error))),
          ),
        );
      } else {
        const { authUrl } = await edgeClient.initiateOAuthFlow(Context.default(), {
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

  return {
    startOAuthFlow,
  };
};

/** Finds an OAuth preset by source identifier. */
export const getPresetBySource = (source: string): OAuthPreset | undefined =>
  OAUTH_PRESETS.find((p) => p.source === source);
