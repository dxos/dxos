//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { type OAuthFlowResult } from '@dxos/protocols';
import { type Space } from '@dxos/react-client/echo';
import { useEdgeClient } from '@dxos/react-edge-client';
import { Button, DropdownMenu, IconButton, Input, Popover, useTranslation } from '@dxos/react-ui';
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
  const [showHint, setShowHint] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pendingPreset = useRef<OAuthPreset>(undefined);

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

  const createOauthPreset = useCallback(
    async ({ preset, loginHint }: { preset?: OAuthPreset; loginHint?: string }) => {
      if (!preset) {
        onCustomToken?.();
        return;
      }

      const token = AccessToken.make({
        source: preset.source,
        note: preset.note,
        token: '',
      });

      tokenMap.set(token.id, token);
      localStorage.setItem(
        token.id,
        JSON.stringify({
          spaceId: space.id,
          object: token,
        }),
      );

      const { authUrl } = await edgeClient.initiateOAuthFlow({
        provider: preset.provider,
        scopes: preset.scopes,
        spaceId: space.id,
        accessTokenId: token.id,
        loginHint,
      });

      log.info('open', { authUrl });
      window.open(authUrl, loginHint ? '_blank' : 'oauthPopup', loginHint ? undefined : 'width=500,height=600');
    },
    [space, edgeClient, tokenMap, onCustomToken],
  );

  const handleSelect = useCallback(async (preset?: OAuthPreset) => {
    if (preset?.hintRequired) {
      pendingPreset.current = preset;
      setShowHint(true);
    } else {
      await createOauthPreset({ preset });
    }
  }, []);

  const handleClose = useCallback(() => {
    setShowHint(false);
  }, []);

  const handleHintSubmit = useCallback(
    async (hint: string) => {
      setShowHint(false);
      await createOauthPreset({ preset: pendingPreset.current, loginHint: hint });
      pendingPreset.current = undefined;
    },
    [createOauthPreset],
  );

  // TODO(wittjosiah): There's focus issues between the popover and dropdown menu.
  //   Consider better ways to handle this flow.
  return (
    <Popover.Root open={showHint}>
      <Popover.VirtualTrigger virtualRef={buttonRef} />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <IconButton ref={buttonRef} icon='ph--plus--regular' label={t('add token')} />
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content sideOffset={4} collisionPadding={8}>
            <DropdownMenu.Viewport>
              {OAUTH_PRESETS.map((preset) => (
                <TokenMenuItem key={preset.label} preset={preset} onSelect={handleSelect} />
              ))}
              <TokenMenuItem onSelect={handleSelect} />
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Popover.Portal>
        <Popover.Content
          side='bottom'
          sticky='always'
          hideWhenDetached
          // onInteractOutside={handleClose}
          onEscapeKeyDown={handleClose}
        >
          <Popover.Viewport>
            <LoginHintInput onSubmit={handleHintSubmit} />
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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

const LoginHintInput = ({ onSubmit }: { onSubmit: (hint: string) => void }) => {
  const { t } = useTranslation(meta.id);
  const doneButton = useRef<HTMLButtonElement>(null);
  const [hint, setHint] = useState('');

  const handleDone = useCallback(() => {
    onSubmit(hint);
  }, [hint, onSubmit]);

  return (
    <div role='none' className='p-2 flex gap-2'>
      <div role='none' className='flex-1'>
        <Input.Root>
          <Input.Label srOnly>{t('login hint label')}</Input.Label>
          <Input.TextInput
            autoFocus
            placeholder={t('login hint placeholder')}
            value={hint}
            onChange={({ target: { value } }) => setHint(value)}
            onKeyDown={({ key }) => key === 'Enter' && doneButton.current?.click()}
          />
        </Input.Root>
      </div>
      <Button ref={doneButton} classNames='self-stretch' onClick={handleDone}>
        {t('continue label', { ns: 'os' })}
      </Button>
    </div>
  );
};
