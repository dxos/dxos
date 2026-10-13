//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode, useCallback, useState } from 'react';

import { log } from '@dxos/log';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';

import { translationKey } from '../translations.ts';
import { type StepProps } from './StepProps.ts';

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
  const { t } = Hooks.useTranslation(translationKey);
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
      <Dialog.Body gap='md'>
        <Banner.Root valence='error'>
          <Banner.Title>{resolvedTitle}</Banner.Title>
          <Banner.Body>{resolvedMessage}</Banner.Body>
        </Banner.Root>
        <Field.Root>
          <Field.Label srOnly>{t('confirmation.placeholder', { confirmationValue })}</Field.Label>
          <Input.Root
            disabled={disabled}
            data-testid={`${testIdAffix}.reset-identity-input`}
            placeholder={t('confirmation.placeholder', { confirmationValue })}
            onChange={({ target: { value } }) => setInputValue(value)}
          />
          {validationMessage && <Field.ErrorText>{validationMessage}</Field.ErrorText>}
        </Field.Root>
      </Dialog.Body>
      <Dialog.Footer>
        {onCancel && (
          <Button.Root disabled={disabled} onClick={onCancel} data-testid={`${testIdAffix}.reset-identity-cancel`}>
            {resolvedCancelLabel}
          </Button.Root>
        )}
        {onConfirm && (
          <Button.Root
            variant='destructive'
            disabled={disabled || pending || inputValue !== confirmationValue}
            onClick={handleConfirm}
            data-testid={`${testIdAffix}.reset-identity-confirm`}
          >
            {pending ? resolvedPendingLabel : resolvedConfirmLabel}
          </Button.Root>
        )}
      </Dialog.Footer>
    </>
  );
};
