//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useTranslation } from '@dxos/react-ui';

import { type StepProps } from './StepProps';
import { Action, Actions, StepHeading, Input } from '../components';

export type ResetIdentityProps = StepProps & {
  method: 'reset identity';
  onCancelResetIdentity?: () => void;
};

export type ResetIdentityImplProps = {
  disabled?: boolean;
  pending?: boolean;
  validationMessage?: string;
  onConfirm?: () => void;
  onCancelResetIdentity?: () => void;
};

export const ResetIdentity = ({ send, active, onCancelResetIdentity }: ResetIdentityProps) => {
  const client = useClient();
  const { t } = useTranslation('os');
  const [validationMessage, setValidationMessage] = useState('');
  const [pending, setPending] = useState(false);
  const resetIdentity = () => {
    setPending(true);
    void client.reset().then(
      () => send?.({ type: 'resetIdentity' }),
      (error) => {
        log.catch(error);
        setValidationMessage(t('failed to reset identity message'));
        setPending(false);
      },
    );
  };
  return (
    <ResetIdentityImpl
      disabled={!active}
      pending={pending}
      validationMessage={validationMessage}
      onConfirm={() => resetIdentity()}
      onCancelResetIdentity={onCancelResetIdentity}
    />
  );
};

export const ResetIdentityImpl = ({
  disabled,
  pending,
  validationMessage,
  onConfirm,
  onCancelResetIdentity,
}: ResetIdentityImplProps) => {
  const { t } = useTranslation('os');
  const confirmationValue = t('confirmation value');
  const [inputValue, setInputValue] = useState('');
  return (
    <>
      <div role='none' className='grow flex flex-col justify-center'>
        <Input
          {...{ validationMessage }}
          label={<StepHeading>{t('reset identity input label', { confirmationValue })}</StepHeading>}
          disabled={disabled}
          data-testid='reset-identity-input'
          placeholder={confirmationValue}
          onChange={({ target: { value } }) => setInputValue(value)}
        />
      </div>
      <Actions>
        <Action disabled={disabled} onClick={() => onCancelResetIdentity?.()} data-testid='reset-identity-input-cancel'>
          {t('cancel label')}
        </Action>
        <Action
          variant='destructive'
          disabled={disabled || pending || inputValue !== confirmationValue}
          onClick={() => onConfirm?.()}
          data-testid='reset-identity-input-confirm'
        >
          {pending ? t('reset in progress label') : t('reset device label')}
        </Action>
      </Actions>
    </>
  );
};
