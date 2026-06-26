//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { debounce } from '@dxos/async';
import { useClient } from '@dxos/react-client';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import { ButtonGroup, Clipboard, Input, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, type FormUpdateMeta } from '@dxos/react-ui-form';
import { EmojiPickerBlock, HuePicker } from '@dxos/react-ui-pickers';
import { hexToEmoji, hexToHue } from '@dxos/util';

import { meta } from '#meta';

// TOOD(burdon): Factor out?
// TODO(wittjosiah): Integrate annotations with translations.
const UserProfile = Schema.Struct({
  did: Schema.String.annotations({ title: 'DID' }),
  displayName: Schema.String.annotations({ title: 'Display name' }),
  emoji: Schema.String.annotations({ title: 'Avatar' }),
  hue: Schema.String.annotations({ title: 'Color' }),
});

type UserProfile = Schema.Schema.Type<typeof UserProfile>;

// TODO(thure): Factor out?
const getDefaultHueValue = (identity: Identity | null) => hexToHue(identity?.identityKey.toHex() ?? '0');
const getHueValue = (identity: Identity | null) => identity?.profile?.data?.hue || getDefaultHueValue(identity);
const getDefaultEmojiValue = (identity: Identity | null) => hexToEmoji(identity?.identityKey.toHex() ?? '0');
const getEmojiValue = (identity: Identity | null) => identity?.profile?.data?.emoji || getDefaultEmojiValue(identity);

export const ProfileContainer = () => {
  const { t } = useTranslation(meta.profile.key);
  const client = useClient();
  const identity = useIdentity();
  const [displayName, setDisplayNameDirectly] = useState(identity?.profile?.displayName ?? '');
  const [emoji, setEmojiDirectly] = useState<string>(getEmojiValue(identity));
  const [hue, setHueDirectly] = useState<string>(getHueValue(identity));

  const updateProfile = useMemo(
    () =>
      debounce(
        (profile: Partial<UserProfile>) =>
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

  const handleChange = useCallback(
    (profile: Partial<UserProfile>, meta: FormUpdateMeta<UserProfile>) => {
      for (const [path, changed] of Object.entries(meta.changed)) {
        if (changed) {
          switch (path) {
            case 'displayName':
              setDisplayNameDirectly(profile.displayName ?? '');
              break;
            case 'emoji':
              setEmojiDirectly(profile.emoji ?? getDefaultEmojiValue(identity));
              break;
            case 'hue':
              setHueDirectly(profile.hue ?? getDefaultHueValue(identity));
              break;
            default:
              break;
          }
        }
      }

      void updateProfile(profile);
    },
    [identity],
  );

  const values = useMemo(
    () => ({
      did: identity?.did,
      displayName,
      emoji,
      hue,
    }),
    [identity, displayName, emoji, hue],
  );

  // TODO(wittjosiah): Integrate descriptions with the form schema.
  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      displayName: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback(
          ({ target: { value } }: ChangeEvent<HTMLInputElement>) => onValueChange(type, value),
          [onValueChange, type],
        );

        return (
          <Form.Row label={label} description={t('display-name.description')}>
            <Input.Root>
              <Input.TextInput
                value={getValue()}
                onChange={handleChange}
                placeholder={t('display-name-input.placeholder')}
                classNames='min-w-64'
              />
            </Input.Root>
          </Form.Row>
        );
      },
      emoji: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextEmoji: string) => onValueChange(type, nextEmoji), [onValueChange, type]);
        const handleEmojiReset = useCallback(
          () => onValueChange(type, getDefaultEmojiValue(identity)),
          [onValueChange, type],
        );

        return (
          <Form.Row label={label} description={t('icon.description')}>
            <EmojiPickerBlock
              triggerVariant='default'
              emoji={getValue()}
              onChangeEmoji={handleChange}
              onClickClear={handleEmojiReset}
              classNames='justify-self-end'
            />
          </Form.Row>
        );
      },
      hue: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
        const handleHueReset = useCallback(
          () => onValueChange(type, getDefaultHueValue(identity)),
          [onValueChange, type],
        );

        return (
          <Form.Row label={label} description={t('hue.description')}>
            <div className='flex justify-self-end'>
              <HuePicker value={getValue()} onChange={handleChange} onReset={handleHueReset} />
            </div>
          </Form.Row>
        );
      },
      // TODO(wittjosiah): We need text input annotations for disabled and copyable.
      did: ({ label, getValue }) => {
        return (
          <Form.Row label={label} description={t('did.description')}>
            <Input.Root>
              <ButtonGroup classNames='w-full'>
                <Input.TextInput value={getValue()} disabled classNames='min-w-64' />
                <Clipboard.IconButton value={getValue() ?? ''} />
              </ButtonGroup>
            </Input.Root>
          </Form.Row>
        );
      },
    }),
    [t],
  );

  return (
    <Clipboard.Provider>
      <Form.Root
        variant='settings'
        schema={UserProfile}
        values={values}
        fieldMap={fieldMap}
        onValuesChanged={handleChange}
      >
        <Form.Viewport scroll>
          <Form.Content>
            <Form.Section title={t('profile.label')} description={t('profile.description')}>
              <Form.FieldSet />
            </Form.Section>
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Clipboard.Provider>
  );
};
