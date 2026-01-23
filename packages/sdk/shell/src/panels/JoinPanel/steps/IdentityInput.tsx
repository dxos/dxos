//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useTranslation } from '@dxos/react-ui';
import { type MaybePromise } from '@dxos/util';

import { Action, Actions, Input, StepHeading } from '../../../components';
import { translationKey } from '../../../translations';
import { type JoinStepProps } from '../JoinPanelProps';

export interface IdentityCreatorProps extends JoinStepProps {
  method: 'recover identity' | 'create identity';
}

export type IdentityInputProps = IdentityCreatorProps;

export type IdentityInputImplProps = IdentityCreatorProps & {
  onConfirm?: (value: string) => MaybePromise<void>;
  validationMessage?: string;
};

export const IdentityInput = (props: IdentityInputProps) => {
  const { send, method } = props;
  const isRecover = method === 'recover identity';
  const client = useClient();
  const { t } = useTranslation(translationKey);
  const [validationMessage, setValidationMessage] = useState('');
  const handleConfirm = async (value: string) => {
    if (isRecover) {
      await client.halo.recoverIdentity({ recoveryCode: value }).then(
        (identity) => {
          send?.({ type: 'selectIdentity' as const, identity });
        },
        (error) => {
          log.catch(error);
          setValidationMessage(t('failed to recover identity message'));
        },
      );
    } else {
      await client.halo.createIdentity({ displayName: value }).then(
        (identity) => {
          send?.({ type: 'selectIdentity' as const, identity });
        },
        (error) => {
          log.catch(error);
          setValidationMessage(t('failed to create identity message'));
        },
      );
    }
  };
  return <IdentityInputImpl {...props} onConfirm={handleConfirm} validationMessage={validationMessage} />;
};

// TODO(zhenyasav): impl shouldn't need send()
export const IdentityInputImpl = (props: IdentityInputImplProps) => {
  const { method, active, onConfirm, validationMessage } = props;
  const { t } = useTranslation(translationKey);
  const [inputValue, setInputValue] = useState('');
  const [pending, setPending] = useState(false);
  const disabled = !active || pending;
  const isRecover = method === 'recover identity';

  const handleConfirm = useCallback(async () => {
    setPending(true);
    await onConfirm?.(inputValue);
    setPending(false);
  }, [onConfirm, inputValue]);

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
          placeholder={isRecover ? t('recovery code placeholder') : t('display name placeholder')}
          onChange={({ target: { value } }) => setInputValue(value)}
        />
      </div>
      <Actions>
        {/* TODO(wittjosiah): This disables returning to deprecated identity creation flow.
        <Action
          variant='ghost'
          disabled={disabled}
          onClick={() => send?.({ type: 'deselectAuthMethod' })}
          data-testid={`${method === 'recover identity' ? 'recover' : 'create'}-identity-input-back`}
        >
          {t('back label')}
        </Action> */}
        <Action
          variant='primary'
          disabled={disabled || inputValue.trim().length === 0}
          onClick={handleConfirm}
          data-testid={`${method === 'recover identity' ? 'recover' : 'create'}-identity-input-continue`}
        >
          {pending ? t('pending label') : t('continue label')}
        </Action>
      </Actions>
    </>
  );
};
