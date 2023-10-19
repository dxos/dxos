//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';
import { type Event, type SingleOrArray } from 'xstate';

import { useTranslation } from '@dxos/react-ui';
import { log } from '@dxos/log';
import { type Identity } from '@dxos/react-client/halo';

import { Action, Actions, StepHeading, Input } from '../../../components';
import { type IdentityPanelStepProps } from '../IdentityPanelProps';
import { type IdentityEvent } from '../identityMachine';

export interface ProfileFormProps extends Omit<IdentityPanelStepProps, 'send'> {
  send?: (event: SingleOrArray<Event<IdentityEvent>>) => void;
  onUpdateProfile?: (profile: NonNullable<Identity['profile']>) => Promise<void>;
  profile?: Identity['profile'];
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

// TODO(zhenyasav): impl shouldn't need send()
export const ProfileFormImpl = (props: ProfileFormImplProps) => {
  const { active, profile, send, onUpdateProfile, validationMessage } = props;
  const disabled = !active;
  const { t } = useTranslation('os');
  const [inputValue, setInputValue] = useState(profile?.displayName ?? '');
  return (
    <>
      <div role='none' className='grow flex flex-col justify-center'>
        <Input
          {...{ validationMessage }}
          label={<StepHeading>{t('display name input label')}</StepHeading>}
          disabled={disabled}
          data-testid='display-name-input'
          placeholder={t('display name input placeholder')}
          value={inputValue}
          onChange={({ target: { value } }) => setInputValue(value)}
          onKeyDown={({ key }) => key === 'Enter' && onUpdateProfile?.({ displayName: inputValue })}
        />
      </div>
      <Actions>
        <Action
          variant='ghost'
          disabled={disabled}
          onClick={() => send?.({ type: 'unchooseAction' })}
          data-testid={'update-profile-form-back'}
        >
          {t('back label')}
        </Action>
        <Action
          variant='primary'
          disabled={disabled}
          onClick={() => onUpdateProfile?.({ displayName: inputValue })}
          data-testid={'update-profile-form-continue'}
        >
          {t('done label')}
        </Action>
      </Actions>
    </>
  );
};
