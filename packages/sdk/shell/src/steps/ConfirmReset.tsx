//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { log } from '@dxos/log';
import { Dialog, Message, useTranslation } from '@dxos/react-ui';

import { Action, Input, StepHeading } from '../components';
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

export const ConfirmReset = ({ active, mode, onCancel, onConfirm }: ConfirmResetProps) => {
  const { t } = useTranslation(translationKey);
  const [validationMessage, setValidationMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const disabled = !active;
  const testIdAffix =
    mode === 'join new identity' ? 'join-new-identity' : mode === 'recover' ? 'recover' : 'reset-storage';

  const confirmationValue = t('confirmation value');

  const handleConfirm = useCallback(async () => {
    setPending(true);
    try {
      await onConfirm?.();
      setPending(false);
    } catch (err) {
      log.catch(err);
      setValidationMessage(t('failed to reset identity message'));
      setPending(false);
    }
  }, [onConfirm, t]);

  return (
    <>
      <Dialog.Body>
        <Message.Root valence='error'>
          <Message.Title>{t('sign out chooser title')}</Message.Title>
          <Message.Content>{t('sign out chooser message')}</Message.Content>
        </Message.Root>
        <Input
          {...{ validationMessage }}
          label={
            <StepHeading className='text-start my-2'>
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
      </Dialog.Body>
      <Dialog.ActionBar classNames='grid grid-cols-2 gap-2'>
        {onCancel && (
          <Action disabled={disabled} onClick={onCancel} data-testid={`${testIdAffix}.reset-identity-cancel`}>
            {t('cancel label')}
          </Action>
        )}
        {onConfirm && (
          <Action
            variant='destructive'
            disabled={disabled || pending || inputValue !== confirmationValue}
            onClick={handleConfirm}
            data-testid={`${testIdAffix}.reset-identity-confirm`}
          >
            {pending ? t('reset in progress label') : t('reset device label')}
          </Action>
        )}
      </Dialog.ActionBar>
    </>
  );
};
