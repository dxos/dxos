//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useState } from 'react';

import { type Key, Obj } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import { type OAuthFlowResult } from '@dxos/protocols';
import { useEdgeClient } from '@dxos/react-edge-client';
import { DropdownMenu, IconButton, useTranslation } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';
import { isTauri } from '@dxos/util';

import { OAUTH_PRESETS, type OAuthPreset } from '../defs';
import { meta } from '../meta';
import { createTauriOAuthInitiator, createTauriServerProvider, openTauriBrowser, performOAuthFlow } from '../oauth';

const GoogleUserInfo = Schema.Struct({
  email: Schema.optional(Schema.String),
});

/**
 * Fetches the Google user's email address using the access token and prepends it to the token's note.
 */
const enrichGoogleTokenWithEmail = (token: AccessToken.AccessToken) =>
  Effect.gen(function* () {
    if (token.source !== 'google.com' || !token.token) {
      return;
    }

    const userInfo = yield* HttpClientRequest.get('https://www.googleapis.com/oauth2/v3/userinfo').pipe(
      HttpClientRequest.setHeader('Authorization', `Bearer ${token.token}`),
      HttpClient.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(GoogleUserInfo)),
      Effect.scoped,
    );

    if (userInfo.email) {
      token.note = `${userInfo.email} - ${token.note ?? ''}`.trim();
    }
  }).pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.catchAll((error) => Effect.sync(() => log.warn('failed to fetch google user info', { error }))),
  );

type NewTokenSelectorProps = {
  spaceId: Key.SpaceId;
  onAddAccessToken: (token: AccessToken.AccessToken) => void;
  onCustomToken?: () => void;
};

export const NewTokenSelector = ({ spaceId, onAddAccessToken, onCustomToken }: NewTokenSelectorProps) => {
  const { t } = useTranslation(meta.id);
  const edgeClient = useEdgeClient();
  const [tokenMap] = useState(new Map<string, AccessToken.AccessToken>());

  useEffect(() => {
    // Only set up postMessage listener for web (non-Tauri) environment.
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

          token.token = data.accessToken;
          yield* enrichGoogleTokenWithEmail(token);
          onAddAccessToken(token);
        }),
      ).catch(log.catch);

    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener);
    };
  }, [tokenMap, edgeClient.baseUrl, onAddAccessToken]);

  const createOauthPreset = async (preset?: OAuthPreset) => {
    if (!preset) {
      onCustomToken?.();
      return;
    }

    const token = Obj.make(AccessToken.AccessToken, {
      source: preset.source,
      note: preset.note,
      token: '',
    });

    tokenMap.set(token.id, token);

    if (isTauri()) {
      // Tauri path: Use shared OAuth flow with Tauri implementations.
      // Uses Rust to make HTTP request to Edge (bypasses browser Origin header restrictions).
      await runAndForwardErrors(
        performOAuthFlow(
          preset,
          token,
          edgeClient,
          spaceId,
          createTauriServerProvider(),
          openTauriBrowser,
          createTauriOAuthInitiator(),
        ).pipe(
          Effect.tap(() => enrichGoogleTokenWithEmail(token)),
          Effect.tap(() => onAddAccessToken(token)),
          Effect.catchAll((error) => Effect.sync(() => log.catch(error))),
        ),
      );
    } else {
      // Web path: Use window.open + postMessage approach.
      const { authUrl } = await edgeClient.initiateOAuthFlow({
        provider: preset.provider,
        scopes: preset.scopes,
        spaceId,
        accessTokenId: token.id,
      });

      log.info('open', { authUrl });
      window.open(authUrl, 'oauthPopup', 'width=500,height=600');
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton icon='ph--plus--regular' label={t('add token')} />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={4} collisionPadding={8}>
          <DropdownMenu.Viewport>
            {OAUTH_PRESETS.map((preset) => (
              <TokenMenuItem key={preset.label} preset={preset} onSelect={createOauthPreset} />
            ))}
            <TokenMenuItem onSelect={createOauthPreset} />
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

const TokenMenuItem = ({ preset, onSelect }: { preset?: OAuthPreset; onSelect: (preset?: OAuthPreset) => void }) => {
  const { t } = useTranslation(meta.id);
  const handleSelect = useCallback(() => onSelect(preset), [preset, onSelect]);
  return (
    <DropdownMenu.Item key={preset?.label} onClick={handleSelect}>
      {preset?.label ?? t('add custom token')}
    </DropdownMenu.Item>
  );
};
