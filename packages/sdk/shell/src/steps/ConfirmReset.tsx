//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { log } from '@dxos/log';
import { Message, useTranslation } from '@dxos/react-ui';

import { Action, Actions, Input, StepHeading } from '../components';
import { translationKey } from '../translations';

import { type StepProps } from './StepProps';

type ConfirmResetOptions = Partial<{
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  mode: 'join new identity' | 'recover' | 'reset storage';
}>;

export type ConfirmResetProps = StepProps & ConfirmResetOptions;

export type ConfirmResetImplProps = ConfirmResetOptions & {
  disabled?: boolean;
  pending?: boolean;
  validationMessage?: string;
};

export const ConfirmReset = ({ active, onCancel, onConfirm, mode }: ConfirmResetProps) => {
  const { t } = useTranslation(translationKey);
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
  const { t } = useTranslation(translationKey);
  const confirmationValue = t('confirmation value');
  const [inputValue, setInputValue] = useState('');
  const testIdAffix =
    mode === 'join new identity' ? 'join-new-identity' : mode === 'recover' ? 'recover' : 'reset-storage';
  return (
    <>
      <div role='none' className='grow flex flex-col gap-2 justify-center'>
        <Message.Root valence='error'>
          <Message.Title>{t('sign out chooser title')}</Message.Title>
          <Message.Content>{t('sign out chooser message')}</Message.Content>
        </Message.Root>
        <Input
          {...{ validationMessage }}
          label={
            <StepHeading className='text-start mlb-2'>
              {t(
                mode === 'join new identity'
                  ? 'join new identity input label'
                  : mode === 'recover'
                    ? 'recover reset input label'
                    : 'reset storage input label',
                {
                  confirmationValue,
                },
              )}
            </StepHeading>
          }
          disabled={disabled}
          data-testid={`${testIdAffix}.reset-identity-input`}
          placeholder={t('confirmation placeholder', { confirmationValue })}
          onChange={({ target: { value } }) => setInputValue(value)}
        />
      </div>
      <Actions>
        {onCancel && (
          <Action disabled={disabled} onClick={onCancel} data-testid={`${testIdAffix}.reset-identity-cancel`}>
            {t('cancel label')}
          </Action>
        )}
        {onConfirm && (
          <Action
            variant='destructive'
            disabled={disabled || pending || inputValue !== confirmationValue}
            onClick={onConfirm}
            data-testid={`${testIdAffix}.reset-identity-confirm`}
          >
            {pending ? t('reset in progress label') : t('reset device label')}
          </Action>
        )}
      </Actions>
    </>
  );
};
