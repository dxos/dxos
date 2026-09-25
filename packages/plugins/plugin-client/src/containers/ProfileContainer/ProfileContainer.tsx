//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ChangeEvent, type Dispatch, type SetStateAction, useCallback, useMemo, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { debounce } from '@dxos/async';
import { type Identity } from '@dxos/halo';
import { useIdentity } from '@dxos/halo-react';
import { ButtonGroup, Field, Flex, SystemIconButton, useControlledState, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, type FormUpdateMeta } from '@dxos/react-ui-form';
import { EmojiPickerBlock, HuePicker } from '@dxos/react-ui-pickers';
import { hexToEmoji, hexToHue } from '@dxos/util';

import { meta } from '#meta';
import { ClientOperation } from '#operations';

// TOOD(burdon): Factor out?
// TODO(wittjosiah): Integrate annotations with translations.
const UserProfile = Schema.Struct({
  did: Schema.String.annotate({ title: 'DID' }),
  displayName: Schema.String.annotate({ title: 'Display name' }),
  emoji: Schema.String.annotate({ title: 'Avatar' }),
  hue: Schema.String.annotate({ title: 'Color' }),
});

type UserProfile = Schema.Schema.Type<typeof UserProfile>;

// TODO(thure): Factor out?
const getDefaultHueValue = (identity?: Identity.Info): string => hexToHue(identity?.identityKey ?? '0');
const getHueValue = (identity?: Identity.Info): string => identity?.data?.hue || getDefaultHueValue(identity);
const getDefaultEmojiValue = (identity?: Identity.Info): string => hexToEmoji(identity?.identityKey ?? '0');
const getEmojiValue = (identity?: Identity.Info): string => identity?.data?.emoji || getDefaultEmojiValue(identity);

/**
 * `useControlledState`, frozen while `pending` — so a resync from the live identity (a change from
 * another device/session) can't clobber an edit whose debounced write hasn't reached the server yet.
 */
const usePendingGatedState = <T,>(value: T, pending: boolean): [T, Dispatch<SetStateAction<T>>] => {
  const lastRef = useRef(value);
  if (!pending) {
    lastRef.current = value;
  }
  return useControlledState(lastRef.current);
};

export const ProfileContainer = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const identity = useIdentity();
  const pendingRef = useRef(false);
  const [displayName, setDisplayNameDirectly] = usePendingGatedState(identity?.displayName ?? '', pendingRef.current);
  const [emoji, setEmojiDirectly] = usePendingGatedState(getEmojiValue(identity), pendingRef.current);
  const [hue, setHueDirectly] = usePendingGatedState(getHueValue(identity), pendingRef.current);

  const updateProfile = useMemo(
    () =>
      debounce(
        // Merge onto the current profile data so unrelated metadata is preserved.
        (profile: Partial<UserProfile>, currentData?: Record<string, unknown>) => {
          void invokePromise(ClientOperation.UpdateProfile, {
            displayName: profile.displayName,
            data: {
              ...currentData,
              emoji: profile.emoji,
              hue: profile.hue,
            },
          }).finally(() => {
            pendingRef.current = false;
          });
        },
        2_000,
      ),
    [invokePromise],
  );

  const handleChange = useCallback(
    (profile: Partial<UserProfile>, meta: FormUpdateMeta<UserProfile>) => {
      pendingRef.current = true;
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

      void updateProfile(profile, identity?.data);
    },
    [identity, updateProfile],
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
          <Form.Field label={label} description={t('display-name.description')}>
            <Field.Input
              value={getValue()}
              onChange={handleChange}
              placeholder={t('display-name-input.placeholder')}
              classNames='w-64 max-w-full min-w-0'
            />
          </Form.Field>
        );
      },
      emoji: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextEmoji: string) => onValueChange(type, nextEmoji), [onValueChange, type]);
        const handleEmojiReset = useCallback(
          () => onValueChange(type, getDefaultEmojiValue(identity)),
          [onValueChange, type],
        );

        return (
          <Form.Field standalone label={label} description={t('icon.description')}>
            <EmojiPickerBlock
              triggerVariant='default'
              emoji={getValue()}
              onChangeEmoji={handleChange}
              onClickClear={handleEmojiReset}
              classNames='justify-self-end'
            />
          </Form.Field>
        );
      },
      hue: ({ type, label, getValue, onValueChange }) => {
        const handleChange = useCallback((nextHue: string) => onValueChange(type, nextHue), [onValueChange, type]);
        const handleHueReset = useCallback(
          () => onValueChange(type, getDefaultHueValue(identity)),
          [onValueChange, type],
        );

        return (
          <Form.Field standalone label={label} description={t('hue.description')}>
            <Flex classNames='justify-self-end'>
              <HuePicker value={getValue()} onChange={handleChange} onReset={handleHueReset} />
            </Flex>
          </Form.Field>
        );
      },
      // TODO(wittjosiah): We need text input annotations for disabled and copyable.
      did: ({ label, getValue }) => {
        return (
          <Form.Field label={label} description={t('did.description')}>
            <ButtonGroup classNames='w-full'>
              {/* `flex-1 min-w-0` lets the field shrink below its content width so the copy button
                    stays inside the row at phone widths; a fixed `min-w-*` would push it past the panel edge. */}
              <Field.Input value={getValue()} disabled classNames='w-full min-w-0' />
              <SystemIconButton.Clipboard iconOnly value={getValue() ?? ''} />
            </ButtonGroup>
          </Form.Field>
        );
      },
    }),
    [t],
  );

  return (
    <Form.Root
      variant='settings'
      schema={UserProfile}
      values={values}
      fieldMap={fieldMap}
      onValuesChanged={handleChange}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={t('profile.label')} description={t('profile.description')}>
            <Form.Fields />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

ProfileContainer.displayName = 'ProfileContainer';
