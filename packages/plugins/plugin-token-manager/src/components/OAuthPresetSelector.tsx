//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { SpaceAction } from '@dxos/plugin-space/types';
import { type OAuthFlowResult, OAuthProvider } from '@dxos/protocols';
import { create, type Space } from '@dxos/react-client/echo';
import { useEdgeClient } from '@dxos/react-edge-client';
import { Button, DropdownMenu, useTranslation } from '@dxos/react-ui';
import { AccessTokenType } from '@dxos/schema';

import { TOKEN_MANAGER_PLUGIN } from '../meta';

const OAUTH_PRESETS: OAuthPreset[] = [
  {
    label: 'GMail',
    note: 'Email read access.',
    source: 'https://gmail.com/',
    provider: OAuthProvider.GOOGLE,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  },
];

export const OAuthPresetSelector = ({ space }: { space: Space }) => {
  const { t } = useTranslation(TOKEN_MANAGER_PLUGIN);
  const edgeClient = useEdgeClient();
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const [tokenMap] = useState(new Map<string, AccessTokenType>());

  useEffect(() => {
    const edgeUrl = new URL(edgeClient.baseUrl);

    const listener = (event: MessageEvent) => {
      if (event.origin === edgeUrl.origin) {
        const data = event.data as OAuthFlowResult;
        if (data.success) {
          const token = tokenMap.get(data.accessTokenId);
          if (token) {
            token.token = data.accessToken;
            dispatch(createIntent(SpaceAction.AddObject, { object: token, target: space, hidden: true })).catch((e) =>
              log.catch(e),
            );
          } else {
            log.warn('token object not found', data);
          }
        } else {
          log.warn('oauth flow failed', data);
        }
      }
    };

    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener);
    };
  }, [tokenMap, space]);

  const createOauthPreset = async (preset: OAuthPreset) => {
    const token = create(AccessTokenType, {
      source: preset.source,
      note: preset.note,
      token: '',
    });
    tokenMap.set(token.id, token);

    const { authUrl } = await edgeClient.initiateOAuthFlow({
      provider: preset.provider,
      scopes: preset.scopes,
      spaceId: space.id,
      accessTokenId: token.id,
    });

    log.info('open', { authUrl });

    window.open(authUrl, 'oauthPopup', 'width=500,height=600');
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button>{t('add oauth token')}</Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content sideOffset={4} collisionPadding={8}>
        <DropdownMenu.Viewport>
          {OAUTH_PRESETS.map((preset) => (
            <DropdownMenu.Item key={preset.label} onClick={() => createOauthPreset(preset)}>
              {preset.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Viewport>

        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

type OAuthPreset = {
  label: string;
  note: string;
  source: string;
  provider: OAuthProvider;
  scopes: string[];
};
