//
// Copyright 2023 DXOS.org
//

import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { debounce } from '@dxos/async';
import { useClient } from '@dxos/react-client';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import { Clipboard, Input, Toolbar, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';
import { EmojiPickerBlock, HuePicker } from '@dxos/react-ui-pickers';
import { hexToHue, hexToEmoji } from '@dxos/util';

import { CLIENT_PLUGIN } from '../meta';

// TODO(thure): Factor out?
const getHueValue = (identity: Identity | null) =>
  identity?.profile?.data?.hue || hexToHue(identity?.identityKey.toHex() ?? '0');
const getEmojiValue = (identity: Identity | null) =>
  identity?.profile?.data?.emoji || hexToEmoji(identity?.identityKey.toHex() ?? '0');

export const ProfileContainer = () => {
  const { t } = useTranslation(CLIENT_PLUGIN);
  const client = useClient();
  const identity = useIdentity();
  const [displayName, setDisplayNameDirectly] = useState(identity?.profile?.displayName ?? '');
  const [emoji, setEmojiDirectly] = useState<string>(getEmojiValue(identity));
  const [hue, setHueDirectly] = useState<string>(getHueValue(identity));

  const updateDisplayName = useMemo(
    () =>
      debounce(
        (nextDisplayName: string) => client.halo.updateProfile({ ...identity?.profile, displayName: nextDisplayName }),
        3_000,
      ),
    [identity],
  );

  const setDisplayName = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextDisplayName = event.target.value;
      setDisplayNameDirectly(nextDisplayName);
      updateDisplayName(nextDisplayName);
    },
    [updateDisplayName],
  );

  const setEmoji = useCallback(
    (nextEmoji: string | undefined) => {
      setEmojiDirectly(nextEmoji ?? hexToEmoji(identity?.identityKey.toHex() ?? '0'));
      void client.halo.updateProfile({ ...identity?.profile, data: { ...identity?.profile?.data, emoji: nextEmoji } });
    },
    [client, identity],
  );

  const handleEmojiReset = useCallback(() => setEmoji(undefined), [setEmoji]);

  const setHue = useCallback(
    (nextHue: string | undefined) => {
      setHueDirectly(nextHue ?? hexToHue(identity?.identityKey.toHex() ?? '0'));
      void client.halo.updateProfile({ ...identity?.profile, data: { ...identity?.profile?.data, hue: nextHue } });
    },
    [client, identity],
  );

  const handleHueReset = useCallback(() => setHue(undefined), [setHue]);

  // TODO(wittjosiah): Ideally this should use `Form`.
  //   However there's no existing schema for the profile data and `Form` does not yet have wide screen styling.
  //   Aligning with how the forms are implemented on settings pages as a stopgap to replacing them all with `Form`.
  return (
    <Clipboard.Provider>
      <DeprecatedFormContainer>
        <DeprecatedFormInput label={t('display name label')}>
          <Input.TextInput
            placeholder={t('display name input placeholder')}
            value={displayName}
            onChange={setDisplayName}
          />
        </DeprecatedFormInput>
        <DeprecatedFormInput label={t('icon label')}>
          <Toolbar.Root>
            {/* TODO(wittjosiah): This isn't working. */}
            <EmojiPickerBlock emoji={emoji} onChangeEmoji={setEmoji} onClickClear={handleEmojiReset} />
          </Toolbar.Root>
        </DeprecatedFormInput>
        <DeprecatedFormInput label={t('hue label')}>
          <Toolbar.Root>
            <HuePicker value={hue} onChange={setHue} onReset={handleHueReset} />
          </Toolbar.Root>
        </DeprecatedFormInput>
        <DeprecatedFormInput label={t('did label')}>
          <Input.TextInput value={identity?.did} disabled />
          <Clipboard.IconButton value={identity?.did ?? ''} />
        </DeprecatedFormInput>
      </DeprecatedFormContainer>
    </Clipboard.Provider>
  );
};
