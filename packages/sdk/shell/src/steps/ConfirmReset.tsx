//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { log } from '@dxos/log';
import { Dialog, Message, useTranslation } from '@dxos/react-ui';

import { Action, TextInput } from '../components';
import { translationKey } from '../translations';
import { type StepProps } from './StepProps';

export type ConfirmResetMode = 'join-new-identity' | 'recover' | 'reset-storage';

type ConfirmResetOptions = Partial<{
  mode: ConfirmResetMode;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}>;

export type ConfirmResetProps = StepProps & ConfirmResetOptions;

export const ConfirmReset = ({ active, mode, onCancel, onConfirm }: ConfirmResetProps) => {
  const { t } = useTranslation(translationKey);
  const [validationMessage, setValidationMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const disabled = !active;
  const testIdAffix = mode ?? 'reset-storage';

  const confirmationValue = t('confirmation.value');

  const handleConfirm = useCallback(async () => {
    setPending(true);
    try {
      await onConfirm?.();
      setPending(false);
    } catch (err) {
      log.catch(err);
      setValidationMessage(t('failed-to-reset-identity.message'));
      setPending(false);
    }
  }, [onConfirm, t]);

  return (
    <>
      <Message.Root valence='error' classNames='mb-2'>
        <Message.Title>{t('sign-out-chooser.title')}</Message.Title>
        <Message.Content>{t('sign-out-chooser.message')}</Message.Content>
      </Message.Root>
      <TextInput
        {...{ validationMessage }}
        // label={
        //   <InputLabel classNames='text-start'>
        //     <Trans
        //       i18nKey={`${translationKey}:${
        //         mode === 'join-new-identity'
        //           ? 'join-new-identity-input.label'
        //           : mode === 'recover'
        //             ? 'recover-reset-input.label'
        //             : 'reset-storage-input.label'
        //       }`}
        //       values={{
        //         confirmationValue,
        //       }}
        //     />
        //   </InputLabel>
        // }
        disabled={disabled}
        data-testid={`${testIdAffix}.reset-identity-input`}
        placeholder={t('confirmation.placeholder', { confirmationValue })}
        onChange={({ target: { value } }) => setInputValue(value)}
      />
      <Dialog.ActionBar classNames='grid grid-cols-2 gap-2'>
        {onCancel && (
          <Action disabled={disabled} onClick={onCancel} data-testid={`${testIdAffix}.reset-identity-cancel`}>
            {t('cancel.label')}
          </Action>
        )}
        {onConfirm && (
          <Action
            variant='destructive'
            disabled={disabled || pending || inputValue !== confirmationValue}
            onClick={handleConfirm}
            data-testid={`${testIdAffix}.reset-identity-confirm`}
          >
            {pending ? t('reset-in-progress.label') : t('reset-device.label')}
          </Action>
        )}
      </Dialog.ActionBar>
    </>
  );
};
