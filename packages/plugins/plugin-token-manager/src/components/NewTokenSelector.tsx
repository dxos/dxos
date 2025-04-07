//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { SpaceAction } from '@dxos/plugin-space/types';
import { type OAuthFlowResult, OAuthProvider } from '@dxos/protocols';
import { create, type Space } from '@dxos/react-client/echo';
import { useEdgeClient } from '@dxos/react-edge-client';
import { DropdownMenu, IconButton, useTranslation } from '@dxos/react-ui';
import { AccessTokenType } from '@dxos/schema';

import { TOKEN_MANAGER_PLUGIN } from '../meta';

type OAuthPreset = {
  label: string;
  note: string;
  source: string;
  provider: OAuthProvider;
  scopes: string[];
};

const OAUTH_PRESETS: OAuthPreset[] = [
  {
    label: 'Gmail',
    note: 'Email read access.',
    source: 'gmail.com',
    provider: OAuthProvider.GOOGLE,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  },
];

export const NewTokenSelector = ({ space, onCustomToken }: { space: Space; onCustomToken?: () => void }) => {
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

  const createOauthPreset = async (preset?: OAuthPreset) => {
    if (!preset) {
      onCustomToken?.();
      return;
    }

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
  const { t } = useTranslation(TOKEN_MANAGER_PLUGIN);
  const handleSelect = useCallback(() => onSelect(preset), [preset, onSelect]);
  return (
    <DropdownMenu.Item key={preset?.label} onClick={handleSelect}>
      {preset?.label ?? t('add custom token')}
    </DropdownMenu.Item>
  );
};
