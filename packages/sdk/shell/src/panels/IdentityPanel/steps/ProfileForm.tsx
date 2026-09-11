//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import React, { useState } from 'react';
import { type Event, type SingleOrArray } from 'xstate';

import { log } from '@dxos/log';
import { toPublicKey } from '@dxos/protocols/buf';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type Identity } from '@dxos/react-client/halo';
import { useClipboard, useTranslation } from '@dxos/react-ui';
import { EmojiPickerBlock, HuePicker } from '@dxos/react-ui-pickers';
import { hexToEmoji, hexToHue } from '@dxos/util';

import { Action, ActionBar, InputLabel, TextInput } from '../../../components/index.ts';
import { translationKey } from '../../../translations.ts';
import { profileString } from '../../../util/index.ts';
import { type IdentityEvent } from '../identityMachine.ts';
import { type IdentityPanelStepProps } from '../IdentityPanelProps.ts';

export type ProfileFormProps = Omit<IdentityPanelStepProps, 'send' | 'devices'> & {
  send?: (event: SingleOrArray<Event<IdentityEvent>>) => void;
  onUpdateProfile?: (profile: NonNullable<Identity['profile']>) => Promise<void>;
  identity?: Identity;
};

export const ProfileForm = (props: ProfileFormProps) => {
  const { onUpdateProfile } = props;
  const { t } = useTranslation(translationKey);
  const [validationMessage, setValidationMessage] = useState('');
  const handleUpdateProfile = async (profile: NonNullable<Identity['profile']>) => {
    await onUpdateProfile?.(profile).catch((error) => {
      log.catch(error);
      setValidationMessage(t('failed-to-update-profile.message'));
    });
  };

  return <ProfileFormImpl {...props} onUpdateProfile={handleUpdateProfile} validationMessage={validationMessage} />;
};

export type ProfileFormImplProps = ProfileFormProps & {
  validationMessage?: string;
};

const ProfileFormImpl = ({ active, identity, send, onUpdateProfile, validationMessage }: ProfileFormImplProps) => {
  const profile = identity?.profile;
  const disabled = !active;
  const { t } = useTranslation(translationKey);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [hue, setHue] = useState<string>(getHueValue(identity));
  const [emoji, setEmoji] = useState<string>(getEmojiValue(identity));
  const { textValue, setTextValue } = useClipboard();
  const identityKeyHex = identityHex(identity);
  const copied = textValue === identityKeyHex;
  return (
    <>
      <div className='grow flex flex-col justify-center'>
        <TextInput
          {...{ validationMessage }}
          label={<InputLabel classNames='m-0'>{t('display-name-input.label')}</InputLabel>}
          disabled={disabled}
          data-testid='display-name-input'
          placeholder={t('display-name-input.placeholder')}
          value={displayName}
          onChange={({ target: { value } }) => setDisplayName(value)}
        />

        <InputLabel classNames='mb-2'>{t('emoji-and-color.label')}</InputLabel>
        <div className='grid grid-cols-[1fr_min-content] gap-y-2'>
          <EmojiPickerBlock
            emoji={emoji}
            onChangeEmoji={setEmoji}
            disabled={disabled}
            onClickClear={() => setEmoji(getEmojiValue(identity))}
          />
          <HuePicker disabled={disabled} value={hue} onChange={setHue} onReset={() => setHue(getHueValue(identity))} />
        </div>
      </div>
      <ActionBar>
        <Action
          variant='ghost'
          disabled={disabled}
          onClick={() => {
            if (identityKeyHex) {
              void setTextValue(identityKeyHex);
            }
          }}
          data-testid='update-profile-form-copy-key'
        >
          {t(copied ? 'copy-success.label' : 'copy-self-did.label')}
        </Action>
        <Action
          variant='ghost'
          disabled={disabled}
          onClick={() => send?.({ type: 'unchooseAction' })}
          data-testid='update-profile-form-back'
        >
          {t('back.label')}
        </Action>
        <Action
          variant='primary'
          disabled={disabled}
          onClick={() =>
            onUpdateProfile?.(
              create(ProfileDocumentSchema, {
                ...(displayName && { displayName }),
                ...((emoji || hue) && { data: { ...(emoji && { emoji }), ...(hue && { hue }) } }),
              }),
            )
          }
          data-testid='update-profile-form-continue'
        >
          {t('done.label')}
        </Action>
      </ActionBar>
    </>
  );
};

const identityHex = (identity?: Identity) => toPublicKey(identity?.identityKey)?.toHex() ?? '0';

const getHueValue = (identity?: Identity) => profileString(identity, 'hue') || hexToHue(identityHex(identity));
const getEmojiValue = (identity?: Identity) => profileString(identity, 'emoji') || hexToEmoji(identityHex(identity));
