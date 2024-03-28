//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';
import { type Event, type SingleOrArray } from 'xstate';

import { log } from '@dxos/log';
import { type Identity } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { hexToEmoji, hexToHue } from '@dxos/util';

import { Action, Actions, StepHeading, Input, useClipboardContext, EmojiPicker, HuePicker } from '../../../components';
import { type IdentityPanelStepProps } from '../IdentityPanelProps';
import { type IdentityEvent } from '../identityMachine';

export interface ProfileFormProps extends Omit<IdentityPanelStepProps, 'send'> {
  send?: (event: SingleOrArray<Event<IdentityEvent>>) => void;
  onUpdateProfile?: (profile: NonNullable<Identity['profile']>) => Promise<void>;
  identity?: Identity;
}

export type ProfileFormImplProps = ProfileFormProps & {
  validationMessage?: string;
};

export const ProfileForm = (props: ProfileFormProps) => {
  const { onUpdateProfile } = props;
  const { t } = useTranslation('os');
  const [validationMessage, setValidationMessage] = useState('');
  const handleUpdateProfile = async (profile: NonNullable<Identity['profile']>) => {
    await onUpdateProfile?.(profile).catch((error) => {
      log.catch(error);
      setValidationMessage(t('failed to update profile message'));
    });
  };
  return <ProfileFormImpl {...props} onUpdateProfile={handleUpdateProfile} validationMessage={validationMessage} />;
};

const getHueValue = (identity?: Identity) =>
  identity?.profile?.data?.hue || hexToHue(identity?.identityKey.toHex() ?? '0');
const getEmojiValue = (identity?: Identity) =>
  identity?.profile?.data?.emoji || hexToEmoji(identity?.identityKey.toHex() ?? '0');

// TODO(zhenyasav): impl shouldn't need send()
const ProfileFormImpl = (props: ProfileFormImplProps) => {
  const { active, identity, send, onUpdateProfile, validationMessage } = props;
  const profile = identity?.profile;
  const disabled = !active;
  const { t } = useTranslation('os');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [hue, setHue] = useState<string>(getHueValue(identity));
  const [emoji, setEmoji] = useState<string>(getEmojiValue(identity));
  const { textValue, setTextValue } = useClipboardContext();
  const identityHex = identity?.identityKey.toHex();
  const copied = textValue === identityHex;
  return (
    <>
      <div role='none' className='grow flex flex-col justify-center'>
        <Input
          {...{ validationMessage }}
          label={<StepHeading className='m-0'>{t('display name input label')}</StepHeading>}
          disabled={disabled}
          data-testid='display-name-input'
          placeholder={t('display name input placeholder')}
          value={displayName}
          onChange={({ target: { value } }) => setDisplayName(value)}
        />
        <StepHeading className='mbe-2'>{t('emoji and color label')}</StepHeading>
        <div role='none' className='grid grid-cols-[1fr_min-content] gap-y-2'>
          <EmojiPicker
            emoji={emoji}
            onChangeEmoji={setEmoji}
            disabled={disabled}
            onClickClear={() => setEmoji(getEmojiValue(identity))}
          />
          <HuePicker
            hue={hue}
            onChangeHue={setHue}
            disabled={disabled}
            onClickClear={() => setHue(getHueValue(identity))}
          />
        </div>
      </div>
      <Actions>
        <Action
          variant='ghost'
          disabled={disabled}
          onClick={() => {
            if (identityHex) {
              void setTextValue(identityHex);
            }
          }}
          data-testid='update-profile-form-copy-key'
        >
          {t(copied ? 'copy success label' : 'copy self public key label')}
        </Action>
        <Action
          variant='ghost'
          disabled={disabled}
          onClick={() => send?.({ type: 'unchooseAction' })}
          data-testid='update-profile-form-back'
        >
          {t('back label')}
        </Action>
        <Action
          variant='primary'
          disabled={disabled}
          onClick={() =>
            onUpdateProfile?.({
              ...(displayName && { displayName }),
              ...((emoji || hue) && { data: { ...(emoji && { emoji }), ...(hue && { hue }) } }),
            })
          }
          data-testid='update-profile-form-continue'
        >
          {t('done label')}
        </Action>
      </Actions>
    </>
  );
};
