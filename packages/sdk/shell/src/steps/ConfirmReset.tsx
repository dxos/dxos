//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode, useCallback, useState } from 'react';

import { log } from '@dxos/log';
import { Dialog, Message, useTranslation } from '@dxos/react-ui';

import { Action, TextInput } from '../components';
import { translationKey } from '../translations';
import { type StepProps } from './StepProps';

export type ConfirmResetMode = 'join-new-identity' | 'recover' | 'reset-storage';

/**
 * Optional overrides for the messaging shown in the confirmation step. Each prop falls back to
 * the shell translation that drives the device-reset flow; callers performing other irreversible
 * actions (e.g. wiping a single space) can swap copy without forking the component.
 */
type ConfirmResetCopy = Partial<{
  title: ReactNode;
  message: ReactNode;
  confirmLabel: ReactNode;
  pendingLabel: ReactNode;
  cancelLabel: ReactNode;
  confirmationValue: string;
  errorMessage: string;
}>;

type ConfirmResetOptions = Partial<{
  mode: ConfirmResetMode;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}> &
  ConfirmResetCopy;

export type ConfirmResetProps = StepProps & ConfirmResetOptions;

export const ConfirmReset = ({
  active,
  mode,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel,
  pendingLabel,
  cancelLabel,
  confirmationValue: confirmationValueProp,
  errorMessage,
}: ConfirmResetProps) => {
  const { t } = useTranslation(translationKey);
  const [validationMessage, setValidationMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const disabled = !active;
  const testIdAffix = mode ?? 'reset-storage';

  const confirmationValue = confirmationValueProp ?? t('confirmation.value');
  const resolvedTitle = title ?? t('sign-out-chooser.title');
  const resolvedMessage = message ?? t('sign-out-chooser.message');
  const resolvedConfirmLabel = confirmLabel ?? t('reset-device.label');
  const resolvedPendingLabel = pendingLabel ?? t('reset-in-progress.label');
  const resolvedCancelLabel = cancelLabel ?? t('cancel.label');

  const handleConfirm = useCallback(async () => {
    setPending(true);
    try {
      await onConfirm?.();
      setPending(false);
    } catch (err) {
      log.catch(err);
      setValidationMessage(errorMessage ?? t('failed-to-reset-identity.message'));
      setPending(false);
    }
  }, [onConfirm, t, errorMessage]);

  return (
    <>
      <Message.Root valence='error' classNames='mb-2'>
        <Message.Title>{resolvedTitle}</Message.Title>
        <Message.Content>{resolvedMessage}</Message.Content>
      </Message.Root>
      <TextInput
        {...{ validationMessage }}
        disabled={disabled}
        data-testid={`${testIdAffix}.reset-identity-input`}
        placeholder={t('confirmation.placeholder', { confirmationValue })}
        onChange={({ target: { value } }) => setInputValue(value)}
      />
      <Dialog.ActionBar classNames='grid grid-cols-2 gap-2'>
        {onCancel && (
          <Action disabled={disabled} onClick={onCancel} data-testid={`${testIdAffix}.reset-identity-cancel`}>
            {resolvedCancelLabel}
          </Action>
        )}
        {onConfirm && (
          <Action
            variant='destructive'
            disabled={disabled || pending || inputValue !== confirmationValue}
            onClick={handleConfirm}
            data-testid={`${testIdAffix}.reset-identity-confirm`}
          >
            {pending ? resolvedPendingLabel : resolvedConfirmLabel}
          </Action>
        )}
      </Dialog.ActionBar>
    </>
  );
};
