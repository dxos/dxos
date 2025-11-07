//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type OAuthFlowResult } from '@dxos/protocols';
import { type Space } from '@dxos/react-client/echo';
import { useEdgeClient } from '@dxos/react-edge-client';
import { DropdownMenu, IconButton, useTranslation } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';

import { OAUTH_PRESETS, type OAuthPreset } from '../defs';
import { meta } from '../meta';

type NewTokenSelectorProps = {
  space: Space;
  onAddAccessToken: (token: AccessToken.AccessToken) => void;
  onCustomToken?: () => void;
};

export const NewTokenSelector = ({ space, onAddAccessToken, onCustomToken }: NewTokenSelectorProps) => {
  const { t } = useTranslation(meta.id);
  const edgeClient = useEdgeClient();
  const [tokenMap] = useState(new Map<string, AccessToken.AccessToken>());

  useEffect(() => {
    const edgeUrl = new URL(edgeClient.baseUrl);

    const listener = (event: MessageEvent) => {
      if (event.origin === edgeUrl.origin) {
        const data = event.data as OAuthFlowResult;
        if (data.success) {
          const token = tokenMap.get(data.accessTokenId);
          if (token) {
            token.token = data.accessToken;
            onAddAccessToken(token);
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

    const token = Obj.make(AccessToken.AccessToken, {
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
  const { t } = useTranslation(meta.id);
  const handleSelect = useCallback(() => onSelect(preset), [preset, onSelect]);
  return (
    <DropdownMenu.Item key={preset?.label} onClick={handleSelect}>
      {preset?.label ?? t('add custom token')}
    </DropdownMenu.Item>
  );
};
