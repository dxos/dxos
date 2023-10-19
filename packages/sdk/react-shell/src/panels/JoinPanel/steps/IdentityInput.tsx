//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';

import { Action, Actions, StepHeading, Input } from '../../../components';
import { type JoinStepProps } from '../JoinPanelProps';

export interface IdentityCreatorProps extends JoinStepProps {
  method: 'recover identity' | 'create identity';
}

export type IdentityInputProps = IdentityCreatorProps;

export type IdentityInputImplProps = IdentityCreatorProps & {
  onDisplayNameConfirm?: (displayName: string) => void;
  validationMessage?: string;
};

export const IdentityInput = (props: IdentityInputProps) => {
  const { send, method } = props;
  const isRecover = method === 'recover identity';
  const client = useClient();
  const { t } = useTranslation('os');
  const [validationMessage, setValidationMessage] = useState('');
  const createIdentity = (displayName: string) => {
    void client.halo.createIdentity({ [isRecover ? 'seedphrase' : 'displayName']: displayName }).then(
      (identity) => {
        send?.({ type: 'selectIdentity' as const, identity });
      },
      (error) => {
        log.catch(error);
        setValidationMessage(t(isRecover ? 'failed to recover identity message' : 'failed to create identity message'));
      },
    );
  };
  return <IdentityInputImpl {...props} onDisplayNameConfirm={createIdentity} validationMessage={validationMessage} />;
};

// TODO(zhenyasav): impl shouldn't need send()
export const IdentityInputImpl = (props: IdentityInputImplProps) => {
  const { method, send, active, onDisplayNameConfirm, validationMessage } = props;
  const disabled = !active;
  const { t } = useTranslation('os');
  const [inputValue, setInputValue] = useState('');
  const isRecover = method === 'recover identity';
  return (
    <>
      <div role='none' className='grow flex flex-col justify-center'>
        <Input
          {...{ validationMessage }}
          label={
            <StepHeading>{t(isRecover ? 'recover identity input label' : 'new identity input label')}</StepHeading>
          }
          disabled={disabled}
          data-testid='identity-input'
          placeholder={isRecover ? 'Type your recovery phrase' : 'Type a display name'}
          onChange={({ target: { value } }) => setInputValue(value)}
        />
      </div>
      <Actions>
        <Action
          variant='ghost'
          disabled={disabled}
          onClick={() => send?.({ type: 'deselectAuthMethod' })}
          data-testid={`${method === 'recover identity' ? 'recover' : 'create'}-identity-input-back`}
        >
          {t('back label')}
        </Action>
        <Action
          variant='primary'
          disabled={disabled}
          onClick={() => onDisplayNameConfirm?.(inputValue)}
          data-testid={`${method === 'recover identity' ? 'recover' : 'create'}-identity-input-continue`}
        >
          {t('continue label')}
        </Action>
      </Actions>
    </>
  );
};
