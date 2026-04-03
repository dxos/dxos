//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type Key } from '@dxos/echo';
import { DropdownMenu, IconButton, useTranslation } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';

import { OAUTH_PRESETS, type OAuthPreset } from '../../defs';
import { useOAuth } from '../../hooks';
import { meta } from '../../meta';

type NewTokenSelectorProps = {
  spaceId: Key.SpaceId;
  onAddAccessToken: (token: AccessToken.AccessToken) => void;
  onCustomToken?: () => void;
};

export const NewTokenSelector = ({ spaceId, onAddAccessToken, onCustomToken }: NewTokenSelectorProps) => {
  const { t } = useTranslation(meta.id);
  const { startOAuthFlow } = useOAuth({ spaceId, onAddAccessToken });

  const createOauthPreset = async (preset?: OAuthPreset) => {
    if (!preset) {
      onCustomToken?.();
      return;
    }

    await startOAuthFlow(preset);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton icon='ph--plus--regular' label={t('add-token')} />
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
      {preset?.label ?? t('add-custom-token')}
    </DropdownMenu.Item>
  );
};
