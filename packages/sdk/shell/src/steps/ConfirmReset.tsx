//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { log } from '@dxos/log';
import { useTranslation } from '@dxos/react-ui';

import { type StepProps } from './StepProps';
import { Action, Actions, StepHeading, Input } from '../components';

type ConfirmResetOptions = Partial<{
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  mode: 'join new identity' | 'reset storage';
}>;

export type ConfirmResetProps = StepProps & ConfirmResetOptions;

export type ConfirmResetImplProps = ConfirmResetOptions & {
  disabled?: boolean;
  pending?: boolean;
  validationMessage?: string;
};

export const ConfirmReset = ({ active, onCancel, onConfirm, mode }: ConfirmResetProps) => {
  const { t } = useTranslation('os');
  const [validationMessage, setValidationMessage] = useState('');
  const [pending, setPending] = useState(false);
  const processReset = async () => {
    setPending(true);
    return onConfirm?.().then(
      () => setPending(false),
      (error) => {
        log.catch(error);
        setValidationMessage(t('failed to reset identity message'));
        setPending(false);
      },
    );
  };
  return (
    <ConfirmResetImpl
      disabled={!active}
      pending={pending}
      validationMessage={validationMessage}
      onConfirm={processReset}
      onCancel={onCancel}
      mode={mode}
    />
  );
};

export const ConfirmResetImpl = ({
  disabled,
  pending,
  validationMessage,
  onConfirm,
  onCancel,
  mode,
}: ConfirmResetImplProps) => {
  const { t } = useTranslation('os');
  const confirmationValue = t('confirmation value');
  const [inputValue, setInputValue] = useState('');
  return (
    <>
      <div role='none' className='grow flex flex-col justify-center'>
        <Input
          {...{ validationMessage }}
          label={
            <StepHeading>
              {t(mode === 'join new identity' ? 'join new identity input label' : 'reset storage input label', {
                confirmationValue,
              })}
            </StepHeading>
          }
          disabled={disabled}
          data-testid='reset-identity-input'
          placeholder={confirmationValue}
          onChange={({ target: { value } }) => setInputValue(value)}
        />
      </div>
      <Actions>
        {onCancel && (
          <Action disabled={disabled} onClick={onCancel} data-testid='reset-identity-input-cancel'>
            {t('cancel label')}
          </Action>
        )}
        {onConfirm && (
          <Action
            variant='destructive'
            disabled={disabled || pending || inputValue !== confirmationValue}
            onClick={onConfirm}
            data-testid='reset-identity-input-confirm'
          >
            {pending ? t('reset in progress label') : t('reset device label')}
          </Action>
        )}
      </Actions>
    </>
  );
};
