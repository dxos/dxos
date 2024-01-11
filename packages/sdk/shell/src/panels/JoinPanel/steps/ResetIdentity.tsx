//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useTranslation } from '@dxos/react-ui';

import { Action, Actions, StepHeading, Input } from '../../../components';
import { type JoinStepProps } from '../JoinPanelProps';

export type ResetIdentityProps = JoinStepProps & {
  method: 'reset identity';
};

export type ResetIdentityImplProps = {
  disabled?: boolean;
  validationMessage?: string;
  onConfirm?: () => void;
};

export const ResetIdentity = ({ send, active }: ResetIdentityProps) => {
  const client = useClient();
  const { t } = useTranslation('os');
  const [validationMessage, setValidationMessage] = useState('');
  const resetIdentity = () => {
    void client.reset().then(
      () => send?.({ type: 'resetIdentity' }),
      (error) => {
        log.catch(error);
        setValidationMessage(t('failed to reset identity message'));
      },
    );
  };
  return (
    <ResetIdentityImpl disabled={!active} validationMessage={validationMessage} onConfirm={() => resetIdentity()} />
  );
};

export const ResetIdentityImpl = ({ disabled, validationMessage, onConfirm }: ResetIdentityImplProps) => {
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
          data-testid='identity-input'
          placeholder={confirmationValue}
          onChange={({ target: { value } }) => setInputValue(value)}
        />
      </div>
      <Actions>
        <Action
          // TODO(wittjosiah): Probably make this red?
          variant='primary'
          disabled={disabled || inputValue !== confirmationValue}
          onClick={() => onConfirm?.()}
          data-testid='reset-identity-input-confirm'
        >
          {t('confirm label')}
        </Action>
      </Actions>
    </>
  );
};
