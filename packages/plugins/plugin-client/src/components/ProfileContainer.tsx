//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';
import React, { useCallback, useMemo, useState } from 'react';

import { debounce } from '@dxos/async';
import { useClient } from '@dxos/react-client';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import { Clipboard, Input, Toolbar, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormInput, Form, type InputComponent } from '@dxos/react-ui-form';
import { EmojiPickerBlock, HuePicker } from '@dxos/react-ui-pickers';
import { hexToHue, hexToEmoji } from '@dxos/util';

import { CLIENT_PLUGIN } from '../meta';

// TODO(thure): Factor out?
const getDefaultHueValue = (identity: Identity | null) => hexToHue(identity?.identityKey.toHex() ?? '0');
const getDefaultEmojiValue = (identity: Identity | null) => hexToEmoji(identity?.identityKey.toHex() ?? '0');
const getHueValue = (identity: Identity | null) => identity?.profile?.data?.hue || getDefaultHueValue(identity);
const getEmojiValue = (identity: Identity | null) => identity?.profile?.data?.emoji || getDefaultEmojiValue(identity);

export const ProfileContainer = () => {
  const { t } = useTranslation(CLIENT_PLUGIN);
  const client = useClient();
  const identity = useIdentity();
  const [displayName, setDisplayNameDirectly] = useState(identity?.profile?.displayName ?? '');
  const [emoji, setEmojiDirectly] = useState<string>(getEmojiValue(identity));
  const [hue, setHueDirectly] = useState<string>(getHueValue(identity));

  const updateProfile = useMemo(
    () =>
      debounce(
        (profile: Partial<Profile>) =>
          client.halo.updateProfile({
            displayName: profile.displayName,
            data: {
              emoji: profile.emoji,
              hue: profile.hue,
            },
          }),
        2_000,
      ),
    [],
  );

  const handleSave = useCallback(
    (profile: Profile) => {
      setDisplayNameDirectly(profile.displayName);
      setEmojiDirectly(profile.emoji);
      setHueDirectly(profile.hue);
      updateProfile(profile);
    },
    [identity],
  );

  const values = useMemo(
    () => ({
      displayName,
      emoji,
      hue,
      did: identity?.did,
    }),
    [identity, displayName, emoji, hue],
  );

  const customElements: Partial<Record<string, InputComponent>> = useMemo(
    () => ({
      emoji: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextEmoji: string) => onValueChange(type, nextEmoji), [onValueChange, type]);
        const handleEmojiReset = useCallback(
          () => onValueChange(type, getDefaultEmojiValue(identity)),
          [onValueChange, type],
        );
        return (
          <DeprecatedFormInput label={label ?? ''}>
            <Toolbar.Root>
              {/* TODO(wittjosiah): This isn't working. */}
              <EmojiPickerBlock emoji={getValue()} onChangeEmoji={handleChange} onClickClear={handleEmojiReset} />
            </Toolbar.Root>
          </DeprecatedFormInput>
        );
      },
      hue: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
        const handleHueReset = useCallback(
          () => onValueChange(type, getDefaultHueValue(identity)),
          [onValueChange, type],
        );
        return (
          <DeprecatedFormInput label={label ?? ''}>
            <Toolbar.Root>
              <HuePicker value={getValue()} onChange={handleChange} onReset={handleHueReset} />
            </Toolbar.Root>
          </DeprecatedFormInput>
        );
      },
      // TODO(wittjosiah): We need text input annotations for disabled and copyable.
      did: ({ getValue }) => {
        return (
          <DeprecatedFormInput label={t('did label')}>
            <Input.TextInput value={getValue()} disabled />
            <Clipboard.IconButton value={getValue() ?? ''} />
          </DeprecatedFormInput>
        );
      },
    }),
    [t],
  );

  return (
    <Clipboard.Provider>
      <Form schema={ProfileSchema} values={values} autoSave onSave={handleSave} Custom={customElements} />
    </Clipboard.Provider>
  );
};

const ProfileSchema = S.Struct({
  displayName: S.String.annotations({ title: 'Display Name' }),
  emoji: S.String.annotations({ title: 'Avatar' }),
  hue: S.String.annotations({ title: 'Avatar Background' }),
  did: S.String.annotations({ title: 'DID' }),
});
type Profile = S.Schema.Type<typeof ProfileSchema>;
