//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { debounce } from '@dxos/async';
import { useClient } from '@dxos/react-client';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import { ButtonGroup, Clipboard, Input, useTranslation } from '@dxos/react-ui';
import { Form, type InputComponent } from '@dxos/react-ui-form';
import { EmojiPickerBlock, HuePicker } from '@dxos/react-ui-pickers';
import { StackItem } from '@dxos/react-ui-stack';
import { hexToHue, hexToEmoji } from '@dxos/util';

import { ControlItem, ControlItemInput, ControlSection } from './ControlSection';
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
      // TODO(wittjosiah): We need text input annotations for disabled and copyable.
      displayName: ({ type, getValue, onValueChange }) => {
        const handleChange = useCallback(
          ({ target: { value } }: ChangeEvent<HTMLInputElement>) => onValueChange(type, value),
          [onValueChange, type],
        );
        return (
          <ControlItemInput title={t('display name label')} description={t('display name description')}>
            <Input.TextInput
              value={getValue()}
              onChange={handleChange}
              placeholder={t('display name input placeholder')}
              classNames='min-is-64'
            />
          </ControlItemInput>
        );
      },
      emoji: ({ type, getValue, onValueChange }) => {
        const handleChange = useCallback((nextEmoji: string) => onValueChange(type, nextEmoji), [onValueChange, type]);
        const handleEmojiReset = useCallback(
          () => onValueChange(type, getDefaultEmojiValue(identity)),
          [onValueChange, type],
        );
        return (
          <ControlItem title={t('icon label')} description={t('icon description')}>
            <EmojiPickerBlock
              triggerVariant='default'
              emoji={getValue()}
              onChangeEmoji={handleChange}
              onClickClear={handleEmojiReset}
            />
          </ControlItem>
        );
      },
      hue: ({ type, getValue, onValueChange }) => {
        const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
        const handleHueReset = useCallback(
          () => onValueChange(type, getDefaultHueValue(identity)),
          [onValueChange, type],
        );
        return (
          <ControlItem title={t('hue label')} description={t('hue description')}>
            <HuePicker
              value={getValue()}
              onChange={handleChange}
              onReset={handleHueReset}
              classNames='[--hue-preview-size:1.5rem]'
            />
          </ControlItem>
        );
      },
      // TODO(wittjosiah): We need text input annotations for disabled and copyable.
      did: ({ getValue }) => {
        return (
          <ControlItemInput title={t('did label')} description={t('did description')}>
            <ButtonGroup>
              <Input.TextInput value={getValue()} disabled classNames='min-is-64' />
              <Clipboard.IconButton value={getValue() ?? ''} />
            </ButtonGroup>
          </ControlItemInput>
        );
      },
    }),
    [t],
  );

  return (
    <StackItem.Content classNames='plb-2 block overflow-y-auto'>
      <Clipboard.Provider>
        <ControlSection title={t('profile label')} description={t('profile description')}>
          <Form
            schema={ProfileSchema}
            values={values}
            autoSave
            onSave={handleSave}
            Custom={customElements}
            classNames='p-0 container-max-width [&_[role="form"]]:grid [&_[role="form"]]:grid-cols-1 md:[&_[role="form"]]:grid-cols-[1fr_min-content] [&_[role="form"]]:gap-4'
          />
        </ControlSection>
      </Clipboard.Provider>
    </StackItem.Content>
  );
};

const ProfileSchema = S.Struct({
  displayName: S.String.annotations({ title: 'Display Name' }),
  emoji: S.String.annotations({ title: 'Avatar' }),
  hue: S.String.annotations({ title: 'Avatar Background' }),
  did: S.String.annotations({ title: 'DID' }),
});
type Profile = S.Schema.Type<typeof ProfileSchema>;
