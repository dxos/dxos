//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { debounce } from '@dxos/async';
import { useClient } from '@dxos/react-client';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import { ButtonGroup, Clipboard, Input, useTranslation } from '@dxos/react-ui';
import {
  ControlItem,
  ControlItemInput,
  ControlPage,
  ControlSection,
  Form,
  type InputComponent,
} from '@dxos/react-ui-form';
import { EmojiPickerBlock, HuePicker } from '@dxos/react-ui-pickers';
import { hexToEmoji, hexToHue } from '@dxos/util';

import { meta } from '../meta';

// TODO(thure): Factor out?
const getDefaultHueValue = (identity: Identity | null) => hexToHue(identity?.identityKey.toHex() ?? '0');
const getDefaultEmojiValue = (identity: Identity | null) => hexToEmoji(identity?.identityKey.toHex() ?? '0');
const getHueValue = (identity: Identity | null) => identity?.profile?.data?.hue || getDefaultHueValue(identity);
const getEmojiValue = (identity: Identity | null) => identity?.profile?.data?.emoji || getDefaultEmojiValue(identity);

export const ProfileContainer = () => {
  const { t } = useTranslation(meta.id);
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
      void updateProfile(profile);
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

  // TODO(wittjosiah): Integrate descriptions with the form schema.
  const customElements: Partial<Record<string, InputComponent>> = useMemo(
    () => ({
      displayName: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback(
          ({ target: { value } }: ChangeEvent<HTMLInputElement>) => onValueChange(type, value),
          [onValueChange, type],
        );
        return (
          <ControlItemInput title={label} description={t('display name description')}>
            <Input.TextInput
              value={getValue()}
              onChange={handleChange}
              placeholder={t('display name input placeholder')}
              classNames='min-is-64'
            />
          </ControlItemInput>
        );
      },
      emoji: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextEmoji: string) => onValueChange(type, nextEmoji), [onValueChange, type]);
        const handleEmojiReset = useCallback(
          () => onValueChange(type, getDefaultEmojiValue(identity)),
          [onValueChange, type],
        );
        return (
          <ControlItem title={label} description={t('icon description')}>
            <EmojiPickerBlock
              triggerVariant='default'
              emoji={getValue()}
              onChangeEmoji={handleChange}
              onClickClear={handleEmojiReset}
              classNames='justify-self-end'
            />
          </ControlItem>
        );
      },
      hue: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
        const handleHueReset = useCallback(
          () => onValueChange(type, getDefaultHueValue(identity)),
          [onValueChange, type],
        );
        return (
          <ControlItem title={label} description={t('hue description')}>
            <HuePicker value={getValue()} onChange={handleChange} onReset={handleHueReset} />
          </ControlItem>
        );
      },
      // TODO(wittjosiah): We need text input annotations for disabled and copyable.
      did: ({ label, getValue }) => {
        return (
          <ControlItemInput title={label} description={t('did description')}>
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
    <ControlPage>
      <Clipboard.Provider>
        <ControlSection title={t('profile label')} description={t('profile description')}>
          <Form
            schema={ProfileSchema}
            values={values}
            autoSave
            onSave={handleSave}
            Custom={customElements}
            classNames='container-max-width grid grid-cols-1 md:grid-cols-[1fr_min-content]'
            outerSpacing={false}
          />
        </ControlSection>
      </Clipboard.Provider>
    </ControlPage>
  );
};

// TODO(wittjosiah): Integrate annotations with translations.
const ProfileSchema = Schema.Struct({
  displayName: Schema.String.annotations({ title: 'Display name' }),
  emoji: Schema.String.annotations({ title: 'Avatar' }),
  hue: Schema.String.annotations({ title: 'Color' }),
  did: Schema.String.annotations({ title: 'DID' }),
});
type Profile = Schema.Schema.Type<typeof ProfileSchema>;
