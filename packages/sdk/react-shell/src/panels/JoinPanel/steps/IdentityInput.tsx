//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { ComponentPropsWithoutRef, useState } from 'react';

import { useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { log } from '@dxos/log';
import { Input } from '@dxos/react-appkit';
import { useClient } from '@dxos/react-client';

import { PanelAction, PanelActions, PanelStepHeading } from '../../../components';
import { JoinStepProps } from '../JoinPanelProps';

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
      <Input
        disabled={disabled}
        label={
          <PanelStepHeading>
            {t(isRecover ? 'recover identity input label' : 'new identity input label')}
          </PanelStepHeading>
        }
        onChange={({ target: { value } }) => setInputValue(value)}
        slots={{
          root: { className: 'm-0' },
          input: {
            'data-autofocus': isRecover ? 'recoveringIdentity' : 'creatingIdentity',
            onKeyUp: ({ key }) => key === 'Enter' && onDisplayNameConfirm?.(inputValue),
          } as ComponentPropsWithoutRef<'input'>,
        }}
        {...(validationMessage?.length && { validationValence: 'error', validationMessage })}
        data-testid='identity-input'
      />
      <div role='none' className='grow' />
      <PanelActions>
        <PanelAction
          aria-label={t('continue label')}
          disabled={disabled}
          classNames='order-2'
          onClick={() => onDisplayNameConfirm?.(inputValue)}
          data-testid={`${method === 'recover identity' ? 'recover' : 'create'}-identity-input-continue`}
        >
          <CaretRight weight='light' className={getSize(6)} />
        </PanelAction>
        <PanelAction
          aria-label={t('back label')}
          disabled={disabled}
          onClick={() => send?.({ type: 'deselectAuthMethod' })}
          classNames='flex items-center gap-2 pis-2 pie-4'
          data-testid={`${method === 'recover identity' ? 'recover' : 'create'}-identity-input-back`}
        >
          <CaretLeft weight='light' className={getSize(6)} />
        </PanelAction>
      </PanelActions>
    </>
  );
};
