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

export const IdentityInput = ({ method, send, active }: IdentityCreatorProps) => {
  const disabled = !active;
  const { t } = useTranslation('os');
  const [inputValue, setInputValue] = useState('');
  const client = useClient();
  const [validationMessage, setValidationMessage] = useState('');
  const isRecover = method === 'recover identity';
  const handleNext = () => {
    void client.halo.createIdentity({ [isRecover ? 'seedphrase' : 'displayName']: inputValue }).then(
      (identity) => {
        send({ type: 'selectIdentity' as const, identity });
      },
      (error) => {
        log.catch(error);
        setValidationMessage(t(isRecover ? 'failed to recover identity message' : 'failed to create identity message'));
      },
    );
  };
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
            onKeyUp: ({ key }) => key === 'Enter' && handleNext(),
          } as ComponentPropsWithoutRef<'input'>,
        }}
        {...(validationMessage.length && { validationValence: 'error', validationMessage })}
        data-testid='identity-input'
      />
      <div role='none' className='grow' />
      <PanelActions>
        <PanelAction
          aria-label={t('continue label')}
          disabled={disabled}
          classNames='order-2'
          onClick={handleNext}
          data-testid={`${method === 'recover identity' ? 'recover' : 'create'}-identity-input-continue`}
        >
          <CaretRight weight='light' className={getSize(6)} />
        </PanelAction>
        <PanelAction
          aria-label={t('back label')}
          disabled={disabled}
          onClick={() => send({ type: 'deselectAuthMethod' })}
          classNames='flex items-center gap-2 pis-2 pie-4'
          data-testid={`${method === 'recover identity' ? 'recover' : 'create'}-identity-input-back`}
        >
          <CaretLeft weight='light' className={getSize(6)} />
        </PanelAction>
      </PanelActions>
    </>
  );
};
